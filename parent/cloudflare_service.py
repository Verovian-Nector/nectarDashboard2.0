import os
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class CloudflareDNSService:
    """Service for managing DNS records via Cloudflare API"""
    
    def __init__(self):
        self.api_key = os.getenv("CLOUDFLARE_API_KEY")
        self.zone_id = os.getenv("CLOUDFLARE_ZONE_ID")
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def is_configured(self) -> bool:
        """Check if Cloudflare API is properly configured"""
        return bool(self.api_key and self.zone_id)
    
    async def create_dns_record(self, subdomain: str, ip_address: str, record_type: str = "A") -> Optional[Dict[str, Any]]:
        """Create a DNS record for a tenant subdomain"""
        if not self.is_configured():
            logger.warning("Cloudflare API not configured, skipping DNS record creation")
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                data = {
                    "type": record_type,
                    "name": subdomain,
                    "content": ip_address,
                    "ttl": 300,  # 5 minutes TTL for faster propagation
                    "proxied": True  # Enable Cloudflare proxy for security
                }
                
                response = await client.post(
                    f"{self.base_url}/zones/{self.zone_id}/dns_records",
                    headers=self.headers,
                    json=data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        logger.info(f"DNS record created for {subdomain}: {result['result']['id']}")
                        return result["result"]
                    else:
                        logger.error(f"Cloudflare API error: {result.get('errors', [])}")
                        return None
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error creating DNS record for {subdomain}: {str(e)}")
            return None
    
    async def get_dns_record(self, subdomain: str, record_type: str = "A") -> Optional[Dict[str, Any]]:
        """Get existing DNS record for a subdomain"""
        if not self.is_configured():
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/zones/{self.zone_id}/dns_records",
                    headers=self.headers,
                    params={"name": subdomain, "type": record_type},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success") and result.get("result"):
                        return result["result"][0] if result["result"] else None
                    return None
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting DNS record for {subdomain}: {str(e)}")
            return None
    
    async def update_dns_record(self, record_id: str, subdomain: str, ip_address: str, record_type: str = "A") -> bool:
        """Update an existing DNS record"""
        if not self.is_configured():
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                data = {
                    "type": record_type,
                    "name": subdomain,
                    "content": ip_address,
                    "ttl": 300,
                    "proxied": True
                }
                
                response = await client.put(
                    f"{self.base_url}/zones/{self.zone_id}/dns_records/{record_id}",
                    headers=self.headers,
                    json=data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    success = result.get("success", False)
                    if success:
                        logger.info(f"DNS record updated for {subdomain}")
                    else:
                        logger.error(f"Cloudflare API error: {result.get('errors', [])}")
                    return success
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating DNS record for {subdomain}: {str(e)}")
            return False
    
    async def delete_dns_record(self, record_id: str) -> bool:
        """Delete a DNS record"""
        if not self.is_configured():
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/zones/{self.zone_id}/dns_records/{record_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    success = result.get("success", False)
                    if success:
                        logger.info(f"DNS record deleted: {record_id}")
                    else:
                        logger.error(f"Cloudflare API error: {result.get('errors', [])}")
                    return success
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error deleting DNS record {record_id}: {str(e)}")
            return False
    
    async def ensure_dns_record(self, subdomain: str, ip_address: str, record_type: str = "A") -> Optional[Dict[str, Any]]:
        """Ensure DNS record exists, create or update as needed"""
        if not self.is_configured():
            return None
        
        # Check if record already exists
        existing_record = await self.get_dns_record(subdomain, record_type)
        
        if existing_record:
            # Update existing record if content is different
            if existing_record["content"] != ip_address:
                success = await self.update_dns_record(
                    existing_record["id"], subdomain, ip_address, record_type
                )
                if success:
                    existing_record["content"] = ip_address
                    return existing_record
                return None
            else:
                logger.info(f"DNS record already exists and is up to date for {subdomain}")
                return existing_record
        else:
            # Create new record
            return await self.create_dns_record(subdomain, ip_address, record_type)
    
    async def get_zone_info(self) -> Optional[Dict[str, Any]]:
        """Get information about the configured zone"""
        if not self.is_configured():
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/zones/{self.zone_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        return result["result"]
                    else:
                        logger.error(f"Cloudflare API error: {result.get('errors', [])}")
                        return None
                else:
                    logger.error(f"HTTP {response.status_code}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting zone info: {str(e)}")
            return None

# Global instance
cloudflare_service = CloudflareDNSService()