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
    Flatten ACF data into key-value pairs that match ACF field names or keys.
    """
    acf = property_data.get("acf") or {}
    flat = {}

    # Extract profilegroup
    profilegroup = acf.get("profilegroup") or {}
    flat.update({
        "location": profilegroup.get("location"),
        "beds": profilegroup.get("beds"),
        "bathrooms": profilegroup.get("bathrooms"),
        "property_type": profilegroup.get("property_type"),
        "property_status": profilegroup.get("property_status"),
        "furnished": profilegroup.get("furnished"),
        "parking": profilegroup.get("parking"),
        "living_rooms": profilegroup.get("living_rooms"),
        "region": profilegroup.get("region"),
        "listed": profilegroup.get("listed")
    })

    # Add other groups as needed
    financial = acf.get("financial_group") or {}
    flat.update({
        "incoming_price": financial.get("incoming_price"),
        "outgoing_price": financial.get("outgoing_price")
    })

    # Remove None values
    return {k: v for k, v in flat.items() if v is not None}

# ==================== Sync to WordPress ====================
async def sync_property_to_wordpress(
    property_data: Dict[str, Any],
    action: str = "create"
) -> Optional[Dict[str, Any]]:
    """
    Sync a property to WordPress as a custom post type 'properties'
    """
    # ✅ DEBUG: Log the full payload before sending
    logger.info(f"📤 Preparing to sync property: {property_data.get('title')}")
    logger.info(f"📝 Payload to WordPress: {property_data}")

    # Prepare ACF data
    acf_payload = prepare_acf_data(property_data)
    logger.info(f"🧩 Prepared ACF data: {acf_payload}")  # ✅ DEBUG ACF structure

    # Prepare main payload
    payload = {
        "title": property_data.get("title", "Untitled Property"),
        "status": "publish",
        "content": property_data.get("address", ""),
        "acf": acf_payload
    }

    # Add ID if updating
    if action == "update" and property_data.get("wordpress_id"):
        payload["id"] = property_data["wordpress_id"]

    # ✅ DEBUG: Final payload
    logger.info(f"🚀 Sending to WordPress: {payload}")

    # Set up auth
    auth = (WP_USERNAME, WP_APP_PASSWORD)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            method = "PUT" if action == "update" and property_data.get("wordpress_id") else "POST"
            url = f"{WP_API_ENDPOINT}/{property_data['wordpress_id']}" if method == "PUT" else WP_API_ENDPOINT

            # ✅ DEBUG: Log request details
            logger.info(f"📡 {method} request to: {url}")

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

            # ✅ DEBUG: Log response
            logger.info(f"📨 WordPress Response [{response.status_code}]: {response.text}")

            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ {action.title()}d property '{property_data['title']}' to WordPress (ID: {result['id']})")
                return result
            else:
                logger.error(f"❌ {action.title()} failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            # ✅ DEBUG: Catch any exception
            logger.error(f"💥 Sync failed with exception: {str(e)}", exc_info=True)
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
        
