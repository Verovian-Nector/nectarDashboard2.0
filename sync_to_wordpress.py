# sync_to_wordpress.py
import os
import asyncio
import httpx
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional

# ==================== Configuration ====================
WORDPRESS_SITE_URL = "https://nectarestates.com"  # ✅ No spaces
WP_API_ENDPOINT = f"{WORDPRESS_SITE_URL}/wp-json/wp/v2/properties"  # ✅ 'properties' (plural), not 'property'
WP_USERNAME = os.getenv("WP_USERNAME")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD")

if not WP_USERNAME or not WP_APP_PASSWORD:
    raise ValueError("WP_USERNAME and WP_APP_PASSWORD must be set in environment")

# Optional: Map FastAPI roles to WordPress roles
ROLE_TO_WP_CAPABILITY = {
    "propertyadmin": "administrator",
    "propertymanager": "propertyManager",
    "propertyowner": "propertyOwner",
    "blogger": "editor"
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("wordpress_sync.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


# ==================== Sync Functions ====================
async def sync_property_to_wordpress(
    property_data: Dict[str, Any],
    action: str = "create"  # "create" or "update"
) -> Optional[Dict[str, Any]]:
    """
    Sync a property to WordPress as a custom post type 'properties'
    """
    # Prepare payload
    payload = {
        "title": property_data.get("title", "Untitled Property"),
        "status": "publish",
        "content": property_data.get("address", ""),
        "acf": prepare_acf_data(property_data)
    }

    # Add ID if updating
    if action == "update" and property_data.get("wordpress_id"):
        payload["id"] = property_data["wordpress_id"]

    # Set up auth
    auth = (WP_USERNAME, WP_APP_PASSWORD)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            method = "PUT" if action == "update" and property_data.get("wordpress_id") else "POST"
            url = f"{WP_API_ENDPOINT}/{property_data['wordpress_id']}" if method == "PUT" else WP_API_ENDPOINT

            response = await client.request(
                method=method,
                url=url,
                auth=auth,
                json=payload,
                headers={
                    "User-Agent": "NectarApp-Sync/1.0",
                    "Content-Type": "application/json"
                }
            )

            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ {action.title()}d property '{property_data['title']}' to WordPress (ID: {result['id']})")
                return result
            else:
                logger.error(f"❌ {action.title()} failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"💥 Sync failed: {str(e)}")
            return None


def prepare_acf_data(property_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert FastAPI ACF structure to WordPress ACF format
    """
    acf = property_data.get("acf", {}) or {}

    return {
        "profile_management": acf.get("profile_management", {}),
        "profilegroup": acf.get("profilegroup", {}),
        "gallery_photos": acf.get("gallery_photos"),
        "tenants_group": acf.get("tenants_group", {}),
        "financial_group": acf.get("financial_group", {}),
        "mainenance_group": acf.get("mainenance_group", {}),
        "documents_group": acf.get("documents_group", {}),
        "inventory_group": acf.get("inventory_group", {}),
        "inspection_group": acf.get("inspection_group", {})
    }


async def sync_user_to_wordpress(user_data: Dict[str, Any]):
    """
    Optional: Sync user roles to WordPress (if needed)
    """
    capability = ROLE_TO_WP_CAPABILITY.get(user_data.get("role"))
    if not capability:
        return

    payload = {
        "role": capability
    }

    # This would require a plugin like "User Sync" or custom endpoint
    # For now, just log
    logger.info(f"🔄 User role sync: {user_data['username']} → {capability}")


# ==================== Usage in FastAPI ====================
# Call this from your CRUD functions
async def on_property_created(property_db_obj):
    print(f"🔄 Syncing property to WordPress: {property_db_obj.title}")
    logger.info(f"🔄 Starting sync for: {property_db_obj.title}")
    """
    Call this after creating a property in FastAPI
    """
    property_data = {
        "id": property_db_obj.id,
        "title": property_db_obj.title,
        "address": property_db_obj.address,
        "acf": property_db_obj.acf,
        "wordpress_id": None  # Will be set after sync
    }

    result = await sync_property_to_wordpress(property_data, "create")
    if result:
        # Save WordPress ID back to your DB (optional)
        property_db_obj.wordpress_id = result["id"]
        # await db.commit()


async def on_property_updated(property_db_obj):
    """
    Call this after updating a property in FastAPI
    """
    # Assume you store wordpress_id in your DB
    if not getattr(property_db_obj, "wordpress_id", None):
        await on_property_created(property_db_obj)
        return

    property_data = {
        "id": property_db_obj.id,
        "title": property_db_obj.title,
        "address": property_db_obj.address,
        "acf": property_db_obj.acf,
        "wordpress_id": property_db_obj.wordpress_id
    }

    await sync_property_to_wordpress(property_data, "update")