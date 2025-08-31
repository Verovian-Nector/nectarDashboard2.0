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
    acf = property_data.get("acf") or {}
    profilegroup = acf.get("profilegroup") or {}

    # Map values to match WordPress allowed options
    property_type_map = {
        "Detached": "Detached House",
        "SemiDetached": "Semi detached",
        "Terraced": "Terraced",
        "Maisonette": "Maisonette",
        "Flat": "Flat",
        "Apartment": "Apartment",
        "Bungalow": "Bungalow",
        "Townhouse": "Townhouse",
        "TwoLandings": "Two landings",
        "Office": "Office",
        "Restaurant": "Restaurant",
        "Warehouse": "Warehouse",
        "Retail": "Retail"
    }

    furnished_map = {
        "Furnished": "Furnished",
        "UnFurnished": "UnFurnished",
        "SemiFurnished": "SemiFurnished"
    }
    
    categories_map = {
        "Lettings": "Lettings",
        "Commercial": "Commercial",
        "Short Lets": "Short Lets",
        "Sales": "Sales"
    }

    return {
        "profilegroup": {
            "postcode": profilegroup.get("postcode"),
            "price": profilegroup.get("incoming_price") or profilegroup.get("price"),
            "payment_frequency": profilegroup.get("incoming_payment_frequency"),
            "house_number": profilegroup.get("house_number"),
            "location": profilegroup.get("location"),
            "beds": profilegroup.get("beds"),
            "bathrooms": profilegroup.get("bathrooms"),
            "living_rooms": profilegroup.get("living_rooms"),
            "parking": profilegroup.get("parking"),
            "furnished": furnished_map.get(profilegroup.get("furnished"), profilegroup.get("furnished")),
            "property_type": property_type_map.get(profilegroup.get("property_type"), profilegroup.get("property_type")),
            "categories": categories_map.get(profilegroup.get("categories"), profilegroup.get("categories"))
        }
    }

# ==================== Sync to WordPress ====================
async def sync_property_to_wordpress(
    property_data: Dict[str, Any],
    action: str = "create"
) -> Optional[Dict[str, Any]]:
    # Prepare ACF data
    acf_payload = prepare_acf_data(property_data)

    # Map ACF categories to WordPress taxonomy IDs
    category_name = acf_payload["profilegroup"].get("categories")
    category_id = await get_category_id(category_name) if category_name else None

    # Build payload
    payload = {
        "title": property_data.get("title", "Untitled Property"),
        "status": "publish",
        "content": property_data.get("address", ""),
        "fields": acf_payload  # ← ACF to REST API plugin uses "fields"
    }

    # ✅ Add taxonomy category if found
    if category_id:
        payload["categories"] = [category_id]

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
                headers={"User-Agent": "NectarApp-Sync/1.0"}
            )

            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ {action.title()}d property '{property_data['title']}' (ID: {result['id']})")
                return result
            else:
                logger.error(f"❌ {action.title()} failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"💥 Sync failed: {str(e)}", exc_info=True)
            return None
            
            
# Cache category IDs to avoid repeated API calls
CATEGORY_CACHE = {}

async def get_category_id(category_name: str) -> Optional[int]:
    if category_name in CATEGORY_CACHE:
        return CATEGORY_CACHE[category_name]

    url = "https://nectarestates.com/wp-json/wp/v2/categories"
    params = {"search": category_name}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            if response.status_code == 200:
                categories = response.json()
                for cat in categories:
                    if cat["name"].lower() == category_name.lower():
                        CATEGORY_CACHE[category_name] = cat["id"]
                        return cat["id"]
    except Exception as e:
        logger.error(f"❌ Failed to fetch category ID for '{category_name}': {e}")

    # If not found, log and return None
    logger.warning(f"⚠️ Category '{category_name}' not found in WordPress")
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
        
