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
            
            # Step 5: Create client site record FIRST (so we have a valid ID)
            # Generate the api_url based on subdomain
            main_domain = os.getenv("MAIN_DOMAIN", "homes.viviplatform.com")
            api_url = f"https://{subdomain}.{main_domain}"
            
            client_site = ClientSite(
                id=client_site_id,
                subdomain=subdomain,
                name=name,
                api_url=api_url,
                is_active=True,
                status="active",
                settings=settings or {}
            )
            self.db.add(client_site)
            self.db.flush()  # Flush to get the ID without committing
            
            # Step 6: Create provisioning log entry (now client_site_id is valid)
            log_entry = ClientSiteProvisioningLog(
                client_site_id=client_site_id,
                subdomain=subdomain,
                action="create",
                status="completed",
                completed_at=datetime.utcnow(),
                extra_metadata={
                    "dns_created": bool(dns_result),
                    "dns_record_id": dns_result.get("id") if dns_result else None,
                    "dns_record_name": dns_result.get("name") if dns_result else None,
                    "ssl_certificate_issued": ssl_result.get("success") if ssl_result else False,
                    "ssl_certificate_message": ssl_result.get("message") if ssl_result else None,
                    "admin_user_seeded": True,
                    "admin_username": "admin",
                    "admin_password_pattern": f"{subdomain}123"
                }
            )
            self.db.add(log_entry)
            
            self.db.commit()
            
            # Complete provisioning tracking
            complete_provisioning_tracking(subdomain, success=True)
            
            logger.info(f"Successfully created client site '{subdomain}' with ID {client_site_id}")
            return client_site
            
        except Exception as e:
            # Rollback and create error log entry
            self.db.rollback()
            
            # Try to log the error (may fail if client_site doesn't exist yet)
            try:
                error_log = ClientSiteProvisioningLog(
                    subdomain=subdomain,
                    action="create",
                    status="failed",
                    error_message=str(e),
                    completed_at=datetime.utcnow()
                )
                self.db.add(error_log)
                self.db.commit()
            except Exception:
                pass  # If logging fails, don't mask the original error
            
            # Complete provisioning tracking with error
            complete_provisioning_tracking(subdomain, success=False, error_message=str(e))
            
            logger.error(f"Failed to create client site '{subdomain}': {str(e)}")
            raise
    
    async def _create_client_site_schema(self, subdomain: str) -> str:
        """Create client site-specific database schema and tables directly via SQL"""
        import uuid
        
        try:
            # Check if we're using SQLite
            is_sqlite = str(self.db.bind.url).startswith("sqlite")
            
            if is_sqlite:
                client_site_id = str(uuid.uuid4())
                logger.info(f"Skipping schema creation for client site '{subdomain}' (SQLite environment)")
                return client_site_id

            # Generate client site ID
            client_site_id = str(uuid.uuid4())
            schema_name = f"client_site_{subdomain}"
            
            logger.info(f"Creating schema and tables for client site '{subdomain}' directly via SQL")
            
            # Create the schema
            self.db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            
            # Create users table in the new schema
            self.db.execute(text(f'''
                CREATE TABLE IF NOT EXISTS "{schema_name}".users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) NOT NULL,
                    username VARCHAR(63) NOT NULL UNIQUE,
                    hashed_password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    role VARCHAR(50) DEFAULT 'user',
                    is_active BOOLEAN DEFAULT true,
                    client_site_id VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP WITH TIME ZONE,
                    permissions JSONB DEFAULT '{{}}'::jsonb
                )
            '''))
            
            # Create clients table in the new schema
            self.db.execute(text(f'''
                CREATE TABLE IF NOT EXISTS "{schema_name}".clients (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    address TEXT,
                    company VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{{}}'::jsonb
                )
            '''))
            
            # Create properties table in the new schema
            self.db.execute(text(f'''
                CREATE TABLE IF NOT EXISTS "{schema_name}".properties (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    address TEXT NOT NULL,
                    price DECIMAL(15,2),
                    property_type VARCHAR(50),
                    bedrooms INTEGER,
                    bathrooms INTEGER,
                    square_feet INTEGER,
                    status VARCHAR(20) DEFAULT 'available',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{{}}'::jsonb
                )
            '''))
            
            # Grant permissions
            self.db.execute(text(f'GRANT ALL ON SCHEMA "{schema_name}" TO postgres'))
            self.db.execute(text(f'GRANT ALL ON ALL TABLES IN SCHEMA "{schema_name}" TO postgres'))
            
            self.db.commit()
            
            logger.info(f"Created database schema and tables for client site '{subdomain}' with ID {client_site_id}")
            return client_site_id
            
        except Exception as e:
            logger.error(f"Failed to create database schema for client site '{subdomain}': {str(e)}")
            raise

    async def _seed_admin_user(self, subdomain: str, client_site_id: str) -> None:
        """Seed admin user directly in client site's PostgreSQL schema"""
        try:
            import bcrypt
            import uuid
            
            admin_username = f"admin_{subdomain}"
            admin_password = f"{subdomain}123"
            admin_email = f"admin@{subdomain}.localhost"
            
            # Hash password using bcrypt directly
            hashed_password = bcrypt.hashpw(
                admin_password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            logger.info(f"Seeding admin user for client site '{subdomain}' directly in PostgreSQL schema")
            
            # Check if we're using SQLite
            is_sqlite = str(self.db.bind.url).startswith("sqlite")
            
            if is_sqlite:
                logger.info(f"Skipping admin user seeding for '{subdomain}' (SQLite environment)")
                return
            
            # Generate UUID for the user
            user_id = str(uuid.uuid4())
            
            # Insert admin user directly into the client site schema
            insert_sql = text(f"""
                INSERT INTO client_site_{subdomain}.users 
                (id, email, username, hashed_password, full_name, role, is_active, client_site_id, permissions)
                VALUES (:id, :email, :username, :hashed_password, :full_name, :role, :is_active, :client_site_id, :permissions)
                ON CONFLICT (username) DO NOTHING
            """)
            
            self.db.execute(insert_sql, {
                "id": user_id,
                "email": admin_email,
                "username": admin_username,
                "hashed_password": hashed_password,
                "full_name": "Administrator",
                "role": "propertyadmin",
                "is_active": True,
                "client_site_id": str(client_site_id),
                "permissions": "{}"
            })
            
            self.db.commit()
            
            logger.info(f"Successfully seeded admin user for client site '{subdomain}' with username '{admin_username}' and password '{admin_password}'")
            
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
            
            # Step 4: Delete related records first (to avoid foreign key violations)
            from models import ClientSiteEvent
            self.db.query(ClientSiteEvent).filter(ClientSiteEvent.client_site_id == client_site.id).delete()
            self.db.query(ClientSiteProvisioningLog).filter(ClientSiteProvisioningLog.client_site_id == client_site.id).delete()
            
            # Step 5: Delete client site record
            self.db.delete(client_site)
            
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
            # Check if we're using SQLite
            is_sqlite = str(self.db.bind.url).startswith("sqlite")
            
            if is_sqlite:
                logger.info(f"Skipping schema deletion for client site '{subdomain}' (SQLite environment)")
                return

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