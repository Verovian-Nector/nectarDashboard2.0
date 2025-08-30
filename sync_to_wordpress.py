import os
import asyncio
import httpx
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv  # Make sure python-dotenv is installed

# Load environment variables
load_dotenv()

# ==================== Configuration ====================
WORDPRESS_SITE_URL = "https://nectarestates.com"
WP_API_ENDPOINT = f"{WORDPRESS_SITE_URL}/wp-json/wp/v2/properties"  # CPT: 'properties' (plural)
WP_USERNAME = os.getenv("WP_USERNAME")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD")

if not WP_USERNAME or not WP_APP_PASSWORD:
    raise ValueError("WP_USERNAME and WP_APP_PASSWORD must be set in the .env file")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== Prepare ACF Data ====================
def prepare_acf_data(property_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract and format ACF fields for WordPress.
    Handles nested groups like 'profilegroup', 'financial_group', etc.
    """
    acf = property_data.get("acf") or {}
    flat_acf = {}

    # Flatten known ACF groups
    if "profilegroup" in acf:
        profile = acf["profilegroup"]
        flat_acf.update({
            "location": profile.get("location"),
            "beds": profile.get("beds"),
            "bathrooms": profile.get("bathrooms"),
            "property_type": profile.get("property_type"),
            "property_status": profile.get("property_status"),
            "furnished": profile.get("furnished"),
            "parking": profile.get("parking"),
            "living_rooms": profile.get("living_rooms"),
            "region": profile.get("region"),
            "listed": profile.get("listed")
        })

    # Add more groups as needed (e.g., financial_group, inspection_group)
    return flat_acf

# ==================== Sync to WordPress ====================
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
                headers={"User-Agent": "NectarApp/1.0"}
            )

            if response.status_code in (200, 201, 200):  # 200 for update, 201 for create
                result = response.json()
                logger.info(f"✅ Successfully synced property to WordPress: {result.get('id')}")
                return result
            else:
                logger.error(f"❌ WordPress API Error [{response.status_code}]: {response.text}")
                return None

        except Exception as e:
            logger.error(f"❌ Failed to sync property to WordPress: {e}")
            return None

# ==================== Event Hooks ====================
async def on_property_created(property_db_obj):
    """
    Call this after creating a property in FastAPI
    """
    logger.info(f"🔄 Syncing new property to WordPress: {property_db_obj.title}")

    property_data = {
        "id": property_db_obj.id,
        "title": property_db_obj.title,
        "address": property_db_obj.address,
        "description": property_db_obj.description,
        "acf": property_db_obj.acf or {}
    }

    result = await sync_property_to_wordpress(property_data, "create")

    if result:
        # Optional: Save WordPress ID back to your DB
        property_db_obj.wordpress_id = result["id"]
        # await db.commit() → Do this in your CRUD function if you store wordpress_id
        logger.info(f"✅ WordPress post created with ID: {result['id']}")
    else:
        logger.warning(f"⚠️ Failed to create WordPress post for: {property_db_obj.title}")

async def on_property_updated(property_db_obj):
    """
    Call this after updating a property in FastAPI
    """
    logger.info(f"🔄 Updating property on WordPress: {property_db_obj.title}")

    if not getattr(property_db_obj, "wordpress_id", None):
        await on_property_created(property_db_obj)
        return

    property_data = {
        "id": property_db_obj.id,
        "title": property_db_obj.title,
        "address": property_db_obj.address,
        "description": property_db_obj.description,
        "acf": property_db_obj.acf or {},
        "wordpress_id": property_db_obj.wordpress_id
    }

    result = await sync_property_to_wordpress(property_data, "update")

    if result:
        logger.info(f"✅ WordPress post updated: {result['id']}")
    else:
        logger.warning(f"⚠️ Failed to update WordPress post: {property_db_obj.wordpress_id}")