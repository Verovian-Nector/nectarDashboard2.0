from sqlalchemy.orm import Session
from models import ClientSite, ClientSiteEvent, AdminUser
from database import engine, Base
from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel
from config import settings
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class ClientSiteCreate(BaseModel):
    name: str
    subdomain: str

class ClientSiteResponse(BaseModel):
    id: str
    name: str
    subdomain: str
    api_url: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClientSiteActivationResponse(BaseModel):
    status: str
    activated_at: str

# Create tables
Base.metadata.create_all(bind=engine)

def get_client_site_by_subdomain(db: Session, subdomain: str) -> Optional[ClientSite]:
    """Get a client site by subdomain"""
    return db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()

class TenantCreate(BaseModel):
    name: str
    subdomain: str

class TenantResponse(BaseModel):
    id: str
    name: str
    subdomain: str
    api_url: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TenantActivationResponse(BaseModel):
    status: str
    activated_at: datetime

class ClientSiteEventResponse(BaseModel):
    id: str
    client_site_id: str
    type: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

def create_client_site(db: Session, client_site: ClientSiteCreate) -> ClientSite:
    """Create a new client site"""
    api_url = settings.child_service_base_url.format(subdomain=client_site.subdomain)
    
    db_client_site = ClientSite(
        name=client_site.name,
        subdomain=client_site.subdomain,
        api_url=api_url,
        is_active=False
    )
    
    db.add(db_client_site)
    db.commit()
    db.refresh(db_client_site)
    
    # Create admin user for the client site (skip event logging for now due to schema issues)
    try:
        admin_user = create_admin_user_for_client_site(db, db_client_site.id, client_site.subdomain)
        print(f"Admin user created successfully for client site '{client_site.subdomain}'")
    except Exception as e:
        # Log the error but don't fail the client site creation
        print(f"Failed to create admin user for client site '{client_site.subdomain}': {str(e)}")
    
    return db_client_site

def get_client_site(db: Session, client_site_id: str) -> Optional[ClientSite]:
    """Get a client site by ID"""
    return db.query(ClientSite).filter(ClientSite.id == client_site_id).first()

def get_tenant_by_subdomain(db: Session, subdomain: str) -> Optional[ClientSite]:
    """Backwards-compatible alias: get client site by subdomain"""
    return db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()

def list_client_sites(db: Session, skip: int = 0, limit: int = 100) -> List[ClientSite]:
    """List all client sites"""
    return db.query(ClientSite).offset(skip).limit(limit).all()

def activate_client_site(db: Session, client_site_id: str) -> Optional[ClientSite]:
    """Activate a client site"""
    client_site = db.query(ClientSite).filter(ClientSite.id == client_site_id).first()
    if client_site:
        client_site.is_active = True
        db.commit()
        db.refresh(client_site)
        log_event(db, client_site.id, "activation", f"Client site '{client_site.name}' activated")
    return client_site

def deactivate_client_site(db: Session, client_site_id: str) -> Optional[ClientSite]:
    """Deactivate a client site"""
    client_site = db.query(ClientSite).filter(ClientSite.id == client_site_id).first()
    if client_site:
        client_site.is_active = False
        db.commit()
        db.refresh(client_site)
        log_event(db, client_site.id, "deactivation", f"Client site '{client_site.name}' deactivated")
    return client_site

def update_heartbeat(db: Session, subdomain: str, api_url: str):
    """Update heartbeat for a client site, creating if it doesn't exist"""
    client_site = db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
    
    if not client_site:
        # Create client site if it doesn't exist
        client_site = ClientSite(
            name=subdomain.title(),
            subdomain=subdomain,
            api_url=api_url,
            is_active=False,
            created_at=datetime.utcnow()
        )
        db.add(client_site)
    
    client_site.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(client_site)
    log_event(db, client_site.id, "heartbeat", f"Heartbeat received for '{client_site.subdomain}'")
    return client_site

def get_client_site_status(db: Session, subdomain: str):
    """Get client site status including heartbeat info"""
    client_site = db.query(ClientSite).filter(ClientSite.subdomain == subdomain).first()
    if not client_site:
        return None
    
    # Consider client site alive if last_seen is within last 5 minutes
    is_alive = False
    if client_site.last_seen:
        time_diff = datetime.utcnow() - client_site.last_seen
        is_alive = time_diff.total_seconds() < 300  # 5 minutes
    
    return {
        "alive": is_alive,
        "last_seen": client_site.last_seen.isoformat() if client_site.last_seen else None
    }

def log_event(db: Session, client_site_id: str, type: str, message: str, event_metadata: dict = None) -> ClientSiteEvent:
    """Log an event for a client site - compatible with both SQLite and PostgreSQL"""
    import json
    from datetime import datetime
    import uuid
    
    metadata = event_metadata or {}
    
    # Create event using SQLAlchemy ORM for database compatibility
    event = ClientSiteEvent(
        id=str(uuid.uuid4()),
        client_site_id=client_site_id,
        type=type,
        message=message,
        event_metadata=json.dumps(metadata) if isinstance(metadata, dict) else metadata,
        created_at=datetime.utcnow()
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event

def create_admin_user_for_client_site(db: Session, client_site_id: str, subdomain: str) -> AdminUser:
    """Create a default admin user for a client site"""
    admin_password = f"{subdomain}123"
    hashed_password = pwd_context.hash(admin_password)
    
    # Create a unique username by combining with subdomain
    admin_username = f"admin_{subdomain}"
    
    admin_user = AdminUser(
        email=f"admin@{subdomain}.localhost",
        username=admin_username,
        hashed_password=hashed_password,
        full_name="Administrator",
        role="propertyadmin",  # Use the role expected by child frontend for consistency
        is_active=True,
        extra_metadata={"client_site_id": client_site_id, "auto_created": True}
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Log the admin user creation
    print(f"Admin user '{admin_username}' created for client site '{subdomain}' with password '{admin_password}'")
    
    return admin_user

def list_events(db: Session, client_site_id: str, limit: int = 50) -> List[ClientSiteEvent]:
    return (
        db.query(ClientSiteEvent)
        .filter(ClientSiteEvent.client_site_id == client_site_id)
        .order_by(ClientSiteEvent.created_at.desc())
        .limit(limit)
        .all()
    )