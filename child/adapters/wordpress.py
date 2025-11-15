from typing import Any, Dict, Optional, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from .base import IntegrationAdapter
from .registry import register_adapter

# Type hints from local models
from database import DBProperty, IntegrationConfig

# Reuse existing sync logic
from sync_to_wordpress import (
    prepare_acf_data,
    sync_property_to_wordpress,
    WP_API_ENDPOINT,
    WP_USERNAME,
    WP_APP_PASSWORD,
)


class WordPressAdapter(IntegrationAdapter):
    integration_type = "wordpress_acf"
    direction = "bidirectional"

    async def prepare_outbound_property(
        self,
        property_obj: DBProperty,
        config: IntegrationConfig,
    ) -> Dict[str, Any]:
        property_data = {
            "title": property_obj.title,
            "content": property_obj.content,
            "acf": property_obj.acf or {},
            "wordpress_id": getattr(property_obj, "wordpress_id", None),
        }
        # Returns ACF fields structure consumed by the WP ACF REST plugin
        return prepare_acf_data(property_data)

    async def send_outbound_property(
        self,
        property_obj: DBProperty,
        config: IntegrationConfig,
        db: AsyncSession,
    ) -> Optional[Dict[str, Any]]:
        # Build canonical property payload for existing sync function
        property_data = {
            "title": property_obj.title,
            "content": property_obj.content,
            "acf": property_obj.acf or {},
            "wordpress_id": getattr(property_obj, "wordpress_id", None),
        }

        action = "update" if property_data.get("wordpress_id") else "create"
        result = await sync_property_to_wordpress(property_data, action)

        # Persist sync metadata lightly; caller should handle commit
        if result:
            property_obj.source_last_sync_at = datetime.now(timezone.utc)
            if not property_obj.wordpress_id:
                property_obj.wordpress_id = result.get("id")
        return result

    async def fetch_inbound(
        self,
        config: IntegrationConfig,
        db: AsyncSession,
        page: Optional[int] = None,
        per_page: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch a page of WordPress properties via REST API."""
        transforms = config.transforms or {}
        page = int(page if page is not None else transforms.get("page", 1))
        per_page = int(per_page if per_page is not None else transforms.get("per_page", 20))

        params = {"page": page, "per_page": per_page}
        async with httpx.AsyncClient() as client:
            resp = await client.get(WP_API_ENDPOINT, params=params, auth=(WP_USERNAME, WP_APP_PASSWORD), timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
                return [data]
            return []

    async def fetch_inbound_by_id(
        self,
        external_id: int,
        config: IntegrationConfig,
    ) -> Optional[Dict[str, Any]]:
        """Fetch a single WordPress property by ID."""
        url = f"{WP_API_ENDPOINT}/{external_id}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, auth=(WP_USERNAME, WP_APP_PASSWORD), timeout=30)
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 404:
                return None
            return None

    async def map_inbound_item(
        self,
        item: Dict[str, Any],
        config: IntegrationConfig,
    ) -> Dict[str, Any]:
        """Map WordPress JSON to our canonical property fields."""
        title = (
            (item.get("title") or {}).get("rendered")
            if isinstance(item.get("title"), dict)
            else item.get("title")
        ) or "Imported Property"

        content = (
            (item.get("content") or {}).get("rendered")
            if isinstance(item.get("content"), dict)
            else item.get("content")
        ) or "Imported from WordPress"

        acf = item.get("acf") or item.get("fields") or {}
        profilegroup = acf.get("profilegroup") or {}
        address = profilegroup.get("location") or "Unknown"

        return {
            "title": title,
            "content": content,
            "address": address,
            "description": content or title,
            "acf": acf,
        }


# Auto-register on import
register_adapter(WordPressAdapter())