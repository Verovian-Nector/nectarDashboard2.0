# sync_to_wordpress.py
import httpx
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WordPress Config — UPDATE THESE
WP_SITE_URL = "https://nectarestates.com"
WP_API_ENDPOINT = f"{WP_SITE_URL}/wp-json/wp/v2/properties"
WP_USERNAME = "Tar"
WP_APP_PASSWORD = "wCQG Fp3w UcG9 lgmG 8mRt GyQw"  # Not your login password

async def sync_property_to_wordpress(property_data, action="create"):
    async with httpx.AsyncClient() as client:
        try:
            # Prepare payload
            payload = {
                "title": property_data.get("title", "Untitled"),
                "status": "publish",
                "content": property_data.get("address", ""),
                "acf": property_data.get("acf", {})
            }

            # Use PUT for update, POST for create
            if action == "update" and property_data.get("wordpress_id"):
                url = f"{WP_API_ENDPOINT}/{property_data['wordpress_id']}"
                response = await client.put(url, auth=(WP_USERNAME, WP_APP_PASSWORD), json=payload)
            else:
                response = await client.post(WP_API_ENDPOINT, auth=(WP_USERNAME, WP_APP_PASSWORD), json=payload)

            if response.status_code in [200, 201]:
                result = response.json()
                logger.info(f"✅ Synced to WordPress! Post ID: {result['id']}")
                return result
            else:
                logger.error(f"❌ Sync failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"💥 Sync error: {str(e)}")
            return None


# Test function
async def test_sync():
    test_property = {
        "title": "Test Sync Properties",
        "address": "123 Test Street, Sunderland",
        "acf": {
            "profilegroup": {
                "price": "100",
                "location": "Sunderland",
                "beds": "2",
                "bathrooms": "1"
            }
        }
    }
    await sync_property_to_wordpress(test_property, "create")

# Run test
if __name__ == "__main__":
    asyncio.run(test_sync())