from sqlalchemy.orm import Session
from models import Tenant, TenantEvent
from database import engine, Base
from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel
from config import settings

# Pydantic models
class TenantCreate(BaseModel):
    name: str
    subdomain: str

class TenantResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    api_url: str
    is_active: bool
    created_at: str

class TenantActivationResponse(BaseModel):
    status: str
    activated_at: str

# Create tables
Base.metadata.create_all(bind=engine)

def get_tenant_by_subdomain(db: Session, subdomain: str) -> Optional[Tenant]:
    """Get a tenant by subdomain"""
    return db.query(Tenant).filter(Tenant.subdomain == subdomain).first()

class TenantCreate(BaseModel):
    name: str
    subdomain: str

class TenantResponse(BaseModel):
    id: int
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

class TenantEventResponse(BaseModel):
    id: int
    tenant_id: int
    type: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

def create_tenant(db: Session, tenant: TenantCreate) -> Tenant:
    """Create a new tenant"""
    api_url = settings.child_service_base_url.format(subdomain=tenant.subdomain)
    
    db_tenant = Tenant(
        name=tenant.name,
        subdomain=tenant.subdomain,
        api_url=api_url,
        is_active=False
    )
    
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    # Log event
    log_event(db, db_tenant.id, "info", f"Client site '{db_tenant.name}' created with subdomain '{db_tenant.subdomain}'")
    return db_tenant

def get_tenant(db: Session, tenant_id: int) -> Optional[Tenant]:
    """Get a tenant by ID"""
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()

def get_tenant_by_subdomain(db: Session, subdomain: str) -> Optional[Tenant]:
    """Get a tenant by subdomain"""
    return db.query(Tenant).filter(Tenant.subdomain == subdomain).first()

def list_tenants(db: Session, skip: int = 0, limit: int = 100) -> List[Tenant]:
    """List all tenants"""
    return db.query(Tenant).offset(skip).limit(limit).all()

def activate_tenant(db: Session, tenant_id: int) -> Optional[Tenant]:
    """Activate a tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant:
        tenant.is_active = True
        db.commit()
        db.refresh(tenant)
        log_event(db, tenant.id, "activation", f"Client site '{tenant.name}' activated")
    return tenant

def deactivate_tenant(db: Session, tenant_id: int) -> Optional[Tenant]:
    """Deactivate a tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if tenant:
        tenant.is_active = False
        db.commit()
        db.refresh(tenant)
        log_event(db, tenant.id, "deactivation", f"Client site '{tenant.name}' deactivated")
    return tenant

def update_heartbeat(db: Session, subdomain: str, api_url: str):
    """Update heartbeat for a tenant, creating if it doesn't exist"""
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    
    if not tenant:
        # Create tenant if it doesn't exist
        tenant = Tenant(
            name=subdomain.title(),
            subdomain=subdomain,
            api_url=api_url,
            is_active=False,
            created_at=datetime.utcnow()
        )
        db.add(tenant)
    
    tenant.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(tenant)
    log_event(db, tenant.id, "heartbeat", f"Heartbeat received for '{tenant.subdomain}'")
    return tenant

def get_tenant_status(db: Session, subdomain: str):
    """Get tenant status including heartbeat info"""
    tenant = db.query(Tenant).filter(Tenant.subdomain == subdomain).first()
    if not tenant:
        return None
    
    # Consider tenant alive if last_seen is within last 5 minutes
    is_alive = False
    if tenant.last_seen:
        time_diff = datetime.utcnow() - tenant.last_seen
        is_alive = time_diff.total_seconds() < 300  # 5 minutes
    
    return {
        "alive": is_alive,
        "last_seen": tenant.last_seen.isoformat() if tenant.last_seen else None
    }

def log_event(db: Session, tenant_id: int, type: str, message: str) -> TenantEvent:
    event = TenantEvent(tenant_id=tenant_id, type=type, message=message)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def list_events(db: Session, tenant_id: int, limit: int = 50) -> List[TenantEvent]:
    return (
        db.query(TenantEvent)
        .filter(TenantEvent.tenant_id == tenant_id)
        .order_by(TenantEvent.created_at.desc())
        .limit(limit)
        .all()
    )