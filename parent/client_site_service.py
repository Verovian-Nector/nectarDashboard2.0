# client_site_service.py
import logging
import httpx
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from models import ClientSite, ClientSiteProvisioningLog
from typing import Optional, Dict, Any
from cloudflare_service import cloudflare_service
from ssl_cert_manager import create_ssl_certificate_manager
from performance_monitor import (
    start_provisioning_tracking,
    record_provisioning_step,
    complete_provisioning_tracking
)
import os

logger = logging.getLogger(__name__)

class ClientSiteProvisioningService:
    """Service for managing client site provisioning, updates, and lifecycle"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cloudflare_service = cloudflare_service
        self.lightsail_ip = os.getenv("LIGHTSAIL_IP", "127.0.0.1")
    
    async def create_client_site(self, subdomain: str, name: str, settings: Optional[Dict[str, Any]] = None) -> ClientSite:
        """Create a new client site with schema provisioning, DNS setup, and SSL certificates"""
        
        # Start performance tracking
        start_provisioning_tracking(subdomain)
        
        # Check if client site already exists
        existing_client_site = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if existing_client_site:
            complete_provisioning_tracking(subdomain, success=False, error_message=f"Client site with subdomain '{subdomain}' already exists")
            raise ValueError(f"Client site with subdomain '{subdomain}' already exists")
        
        # Create provisioning log entry
        log_entry = ClientSiteProvisioningLog(
            subdomain=subdomain,
            action="create",
            status="pending"
        )
        self.db.add(log_entry)
        self.db.commit()
        
        try:
            # Step 1: Create client site schema in database
            record_provisioning_step(subdomain, "database_schema_creation", success=True)
            client_site_id = await self._create_client_site_schema(subdomain)
            record_provisioning_step(subdomain, "database_schema_creation", success=True, error=None)
            
            # Step 2: Create DNS record if Cloudflare is configured
            dns_result = None
            if self.cloudflare_service and self.cloudflare_service.is_configured():
                record_provisioning_step(subdomain, "dns_record_creation", success=True)
                dns_result = await self.cloudflare_service.ensure_dns_record(
                    subdomain=subdomain,
                    ip_address=self.lightsail_ip
                )
                
                if dns_result:
                    logger.info(f"DNS record created/updated for {subdomain}: {dns_result.get('id')}")
                    record_provisioning_step(subdomain, "dns_record_creation", success=True, error=None)
                else:
                    logger.warning(f"Failed to create DNS record for {subdomain}")
                    record_provisioning_step(subdomain, "dns_record_creation", success=False, error="DNS record creation failed")
                    # Don't fail the entire provisioning if DNS fails - it can be retried
            else:
                logger.info(f"Skipping DNS creation for {subdomain} - Cloudflare not configured")
                record_provisioning_step(subdomain, "dns_record_creation", success=True, error="Cloudflare not configured")
            
            # Step 3: Issue SSL certificate if certificate manager is configured
            ssl_result = None
            cert_manager = create_ssl_certificate_manager()
            if cert_manager:
                try:
                    record_provisioning_step(subdomain, "ssl_certificate_issuance", success=True)
                    ssl_success, ssl_message = cert_manager.issue_certificate(subdomain)
                    if ssl_success:
                        ssl_result = {"success": True, "message": ssl_message}
                        logger.info(f"SSL certificate issued for {subdomain}: {ssl_message}")
                        record_provisioning_step(subdomain, "ssl_certificate_issuance", success=True, error=None)
                    else:
                        ssl_result = {"success": False, "message": ssl_message}
                        logger.warning(f"Failed to issue SSL certificate for {subdomain}: {ssl_message}")
                        record_provisioning_step(subdomain, "ssl_certificate_issuance", success=False, error=ssl_message)
                        # Don't fail the entire provisioning if SSL fails - it can be retried
                except Exception as ssl_error:
                    ssl_result = {"success": False, "message": str(ssl_error)}
                    logger.warning(f"SSL certificate issuance failed for {subdomain}: {ssl_error}")
                    record_provisioning_step(subdomain, "ssl_certificate_issuance", success=False, error=str(ssl_error))
            else:
                logger.info(f"Skipping SSL certificate issuance for {subdomain} - certificate manager not configured")
                record_provisioning_step(subdomain, "ssl_certificate_issuance", success=True, error="Certificate manager not configured")
            
            # Step 4: Seed admin user in client site database
            record_provisioning_step(subdomain, "admin_user_seeding", success=True)
            await self._seed_admin_user(subdomain, client_site_id)
            record_provisioning_step(subdomain, "admin_user_seeding", success=True, error=None)
            
            # Step 5: Create client site record
            client_site = ClientSite(
                id=client_site_id,
                subdomain=subdomain,
                name=name,
                is_active=True,
                status="active",
                settings=settings or {}
            )
            self.db.add(client_site)
            
            # Update provisioning log with results
            log_entry.status = "completed"
            log_entry.completed_at = datetime.utcnow()
            log_entry.client_site_id = client_site_id
            log_entry.metadata = {
                "dns_created": bool(dns_result),
                "dns_record_id": dns_result.get("id") if dns_result else None,
                "dns_record_name": dns_result.get("name") if dns_result else None,
                "ssl_certificate_issued": ssl_result.get("success") if ssl_result else False,
                "ssl_certificate_message": ssl_result.get("message") if ssl_result else None,
                "admin_user_seeded": True,
                "admin_username": "admin",
                "admin_password_pattern": f"{subdomain}123"
            }
            
            self.db.commit()
            
            # Complete provisioning tracking
            complete_provisioning_tracking(subdomain, success=True)
            
            logger.info(f"Successfully created client site '{subdomain}' with ID {client_site_id}")
            return client_site
            
        except Exception as e:
            # Update provisioning log with error
            log_entry.status = "failed"
            log_entry.error_message = str(e)
            log_entry.completed_at = datetime.utcnow()
            self.db.commit()
            
            # Complete provisioning tracking with error
            complete_provisioning_tracking(subdomain, success=False, error_message=str(e))
            
            logger.error(f"Failed to create client site '{subdomain}': {str(e)}")
            raise
    
    async def _create_client_site_schema(self, subdomain: str) -> str:
        """Create client site-specific database schema"""
        try:
            # Execute database function to create client site schema
            result = self.db.execute(
                text("SELECT create_client_site_schema(:subdomain)"),
                {"subdomain": subdomain}
            )
            client_site_id = result.scalar()
            
            logger.info(f"Created database schema for client site '{subdomain}' with ID {client_site_id}")
            return client_site_id
            
        except Exception as e:
            logger.error(f"Failed to create database schema for client site '{subdomain}': {str(e)}")
            raise

    async def _seed_admin_user(self, subdomain: str, client_site_id: str) -> None:
        """Seed admin user in client site's backend"""
        try:
            admin_username = f"admin_{subdomain}"  # Make username unique per client site
            admin_password = f"{subdomain}123"
            
            # For local development, use the child backend directly
            # The child backend runs on port 8002 and handles tenant-specific data
            child_backend_url = "http://localhost:8002"
            
            logger.info(f"Attempting to seed admin user for client site '{subdomain}' at {child_backend_url}")
            
            # Try to create admin user in child backend
            async with httpx.AsyncClient(timeout=10.0) as client:
                # First, check if the child backend is accessible
                health_response = await client.get(f"{child_backend_url}/health")
                
                if health_response.status_code == 200:
                    logger.info(f"Child backend is accessible, creating admin user for '{subdomain}'")
                    
                    # Create admin user in child backend with client site context
                    create_user_response = await client.post(
                        f"{child_backend_url}/api/admin/users",
                        json={
                            "username": admin_username,
                            "email": f"admin@{subdomain}.localhost",
                            "password": admin_password,
                            "full_name": "Administrator",
                            "role": "propertyadmin",  # Use the role expected by child frontend
                            "is_active": True,
                            "client_site_id": str(client_site_id),
                            "subdomain": subdomain
                        },
                        headers={
                            "X-Internal-Service": "parent-service",
                            "X-Client-Site-ID": subdomain,  # Pass client site context
                            "X-Client-Site-UUID": client_site_id
                        }
                    )
                    
                    if create_user_response.status_code in [200, 201]:
                        logger.info(f"Successfully seeded admin user for client site '{subdomain}' with username '{admin_username}' and password '{admin_password}'")
                    else:
                        logger.warning(f"Failed to create admin user in child backend for '{subdomain}': {create_user_response.status_code} - {create_user_response.text}")
                else:
                    logger.warning(f"Child backend is not accessible at {child_backend_url}, skipping admin user seeding")
            
        except httpx.TimeoutException:
            logger.warning(f"Timeout while trying to seed admin user for client site '{subdomain}' - child backend may not be ready yet")
        except httpx.ConnectError as e:
            logger.warning(f"Could not connect to child backend for '{subdomain}': {str(e)} - child backend may not be ready yet")
        except Exception as e:
            logger.error(f"Failed to seed admin user for client site '{subdomain}': {str(e)}")
            # Don't fail the entire provisioning if admin user seeding fails
            # This can be retried later or done manually
    
    async def delete_client_site(self, subdomain: str) -> bool:
        """Delete a client site, its schema, DNS records, and SSL certificates"""
        
        client_site = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if not client_site:
            raise ValueError(f"Client site with subdomain '{subdomain}' not found")
        
        # Create provisioning log entry
        log_entry = ClientSiteProvisioningLog(
            client_site_id=client_site.id,
            subdomain=subdomain,
            action="delete",
            status="pending"
        )
        self.db.add(log_entry)
        self.db.commit()
        
        try:
            # Step 1: Delete DNS record if Cloudflare is configured
            dns_deleted = False
            if self.cloudflare_service and self.cloudflare_service.is_configured():
                # First try to find the existing DNS record
                existing_record = await self.cloudflare_service.get_dns_record(subdomain)
                if existing_record:
                    dns_deleted = await self.cloudflare_service.delete_dns_record(existing_record["id"])
                    if dns_deleted:
                        logger.info(f"DNS record deleted for {subdomain}")
                    else:
                        logger.warning(f"Failed to delete DNS record for {subdomain}")
                        # Don't fail the entire deletion if DNS cleanup fails
                else:
                    logger.info(f"No DNS record found for {subdomain} to delete")
            else:
                logger.info(f"Skipping DNS cleanup for {subdomain} - Cloudflare not configured")
            
            # Step 2: Revoke SSL certificate if certificate manager is configured
            ssl_revoked = False
            cert_manager = create_ssl_certificate_manager()
            if cert_manager:
                try:
                    ssl_success, ssl_message = cert_manager.revoke_certificate(subdomain)
                    if ssl_success:
                        ssl_revoked = True
                        logger.info(f"SSL certificate revoked for {subdomain}: {ssl_message}")
                    else:
                        logger.warning(f"Failed to revoke SSL certificate for {subdomain}: {ssl_message}")
                        # Don't fail the entire deletion if SSL revocation fails
                except Exception as ssl_error:
                    logger.warning(f"SSL certificate revocation failed for {subdomain}: {ssl_error}")
            else:
                logger.info(f"Skipping SSL certificate revocation for {subdomain} - certificate manager not configured")
            
            # Step 3: Delete client site schema
            await self._delete_client_site_schema(subdomain)
            
            # Step 4: Delete client site record
            self.db.delete(client_site)
            
            # Update provisioning log
            log_entry.status = "completed"
            log_entry.completed_at = datetime.utcnow()
            log_entry.metadata = {
                "dns_deleted": dns_deleted,
                "ssl_revoked": ssl_revoked
            }
            
            self.db.commit()
            
            logger.info(f"Successfully deleted client site '{subdomain}'")
            return True
            
        except Exception as e:
            # Update provisioning log with error
            log_entry.status = "failed"
            log_entry.error_message = str(e)
            log_entry.completed_at = datetime.utcnow()
            self.db.commit()
            
            logger.error(f"Failed to delete client site '{subdomain}': {str(e)}")
            raise
    
    async def _delete_client_site_schema(self, subdomain: str):
        """Delete client site-specific database schema"""
        try:
            # Execute database function to drop client site schema
            self.db.execute(
                text("SELECT drop_client_site_schema(:subdomain)"),
                {"subdomain": subdomain}
            )
            
            logger.info(f"Deleted database schema for client site '{subdomain}'")
            
        except Exception as e:
            logger.error(f"Failed to delete database schema for client site '{subdomain}': {str(e)}")
            raise
    
    async def suspend_client_site(self, subdomain: str) -> ClientSite:
        """Suspend a client site"""
        client_site = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if not client_site:
            raise ValueError(f"Client site with subdomain '{subdomain}' not found")
        
        client_site.status = "suspended"
        client_site.is_active = False
        client_site.updated_at = datetime.utcnow()
        
        # Create provisioning log entry
        log_entry = ClientSiteProvisioningLog(
            client_site_id=client_site.id,
            subdomain=subdomain,
            action="suspend",
            status="completed",
            completed_at=datetime.utcnow()
        )
        self.db.add(log_entry)
        
        self.db.commit()
        
        logger.info(f"Successfully suspended client site '{subdomain}'")
        return client_site
    
    async def activate_client_site(self, subdomain: str) -> ClientSite:
        """Activate a suspended client site"""
        client_site = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if not client_site:
            raise ValueError(f"Client site with subdomain '{subdomain}' not found")
        
        client_site.status = "active"
        client_site.is_active = True
        client_site.updated_at = datetime.utcnow()
        
        # Create provisioning log entry
        log_entry = ClientSiteProvisioningLog(
            client_site_id=client_site.id,
            subdomain=subdomain,
            action="activate",
            status="completed",
            completed_at=datetime.utcnow()
        )
        self.db.add(log_entry)
        
        self.db.commit()
        
        logger.info(f"Successfully activated client site '{subdomain}'")
        return client_site
    
    async def get_client_site_status(self, subdomain: str) -> Dict[str, Any]:
        """Get comprehensive client site status"""
        client_site = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if not client_site:
            raise ValueError(f"Client site with subdomain '{subdomain}' not found")
        
        # Get latest provisioning log
        latest_log = self.db.query(ClientSiteProvisioningLog).filter(
            ClientSiteProvisioningLog.client_site_id == client_site.id
        ).order_by(ClientSiteProvisioningLog.started_at.desc()).first()
        
        return {
            "id": str(client_site.id),
            "subdomain": client_site.subdomain,
            "name": client_site.name,
            "status": client_site.status,
            "is_active": client_site.is_active,
            "created_at": client_site.created_at.isoformat(),
            "updated_at": client_site.updated_at.isoformat(),
            "last_seen": client_site.last_seen.isoformat() if client_site.last_seen else None,
            "settings": client_site.settings,
            "latest_provisioning_log": {
                "action": latest_log.action if latest_log else None,
                "status": latest_log.status if latest_log else None,
                "started_at": latest_log.started_at.isoformat() if latest_log else None,
                "completed_at": latest_log.completed_at.isoformat() if latest_log and latest_log.completed_at else None,
                "error_message": latest_log.error_message if latest_log else None
            } if latest_log else None
        }
    
    async def update_tenant_settings(self, subdomain: str, settings: Dict[str, Any]) -> ClientSite:
        """Update tenant settings"""
        tenant = self.db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
        if not tenant:
            raise ValueError(f"Tenant with subdomain '{subdomain}' not found")
        
        # Merge new settings with existing ones
        current_settings = tenant.settings or {}
        current_settings.update(settings)
        tenant.settings = current_settings
        tenant.updated_at = datetime.utcnow()
        
        # Create provisioning log entry
        log_entry = ClientSiteProvisioningLog(
            client_site_id=tenant.id,
            subdomain=subdomain,
            action="update",
            status="completed",
            completed_at=datetime.utcnow(),
            metadata={"updated_settings": list(settings.keys())}
        )
        self.db.add(log_entry)
        
        self.db.commit()
        
        logger.info(f"Successfully updated settings for tenant '{subdomain}'")
        return tenant