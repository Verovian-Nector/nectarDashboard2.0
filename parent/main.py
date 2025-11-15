from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
import os
import sys

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db, engine, Base
from crud import (
    create_tenant, get_tenant, get_tenant_by_subdomain, list_tenants, activate_tenant, deactivate_tenant,
    update_heartbeat, get_tenant_status, TenantCreate, TenantResponse, TenantActivationResponse, list_events, TenantEventResponse
)
from config import settings

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Parent Backend", version="1.0.0")

class HealthResponse(BaseModel):
    status: str
    timestamp: str

class ConfigResponse(BaseModel):
    main_domain: str
    child_service_port: int
    base_url: str
    child_service_base_url_template: str

class HealthProxyResponse(BaseModel):
    status: str
    latency_ms: float
    timestamp: str

@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "parent-backend"
    }

@app.get("/config", response_model=ConfigResponse)
async def get_config():
    """Get current configuration settings"""
    return {
        "main_domain": settings.MAIN_DOMAIN,
        "child_service_port": settings.CHILD_SERVICE_PORT,
        "base_url": settings.base_url,
        "child_service_base_url_template": settings.child_service_base_url.replace("{subdomain}", "<subdomain>")
    }

@app.post("/tenants", response_model=TenantResponse)
async def create_new_tenant(tenant: TenantCreate, db: Session = Depends(get_db)):
    """Create a new tenant"""
    db_tenant = get_tenant_by_subdomain(db, tenant.subdomain)
    if db_tenant:
        raise HTTPException(status_code=400, detail="Subdomain already registered")
    return create_tenant(db, tenant)

@app.get("/tenants", response_model=List[TenantResponse])
async def get_tenants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all tenants"""
    tenants = list_tenants(db, skip=skip, limit=limit)
    return tenants

@app.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant_by_id(tenant_id: int, db: Session = Depends(get_db)):
    """Get tenant by ID"""
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@app.get("/tenants/{tenant_id}/events", response_model=List[TenantEventResponse])
async def get_tenant_events(tenant_id: int, db: Session = Depends(get_db)):
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    events = list_events(db, tenant_id)
    return events

@app.post("/tenants/{tenant_id}/deactivate", response_model=TenantActivationResponse)
async def deactivate_tenant_endpoint(tenant_id: int, db: Session = Depends(get_db)):
    """Deactivate a tenant"""
    tenant = deactivate_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "status": "deactivated",
        "activated_at": datetime.utcnow().isoformat()
    }

@app.post("/tenants/{tenant_id}/activate", response_model=TenantActivationResponse)
async def activate_tenant_endpoint(tenant_id: int, db: Session = Depends(get_db)):
    """Activate a tenant"""
    tenant = activate_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "status": "activated",
        "activated_at": datetime.utcnow().isoformat()
    }

@app.get("/tenants/{tenant_id}/health", response_model=HealthProxyResponse)
async def proxy_tenant_health(tenant_id: int, db: Session = Depends(get_db)):
    tenant = get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    import httpx, time
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{tenant.api_url}/health")
            latency_ms = (time.perf_counter() - start) * 1000
            if r.status_code == 200:
                return {
                    "status": "online",
                    "latency_ms": round(latency_ms, 2),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            else:
                return {
                    "status": "error",
                    "latency_ms": round(latency_ms, 2),
                    "timestamp": datetime.utcnow().isoformat(),
                }
    except Exception:
        latency_ms = (time.perf_counter() - start) * 1000
        return {
            "status": "offline",
            "latency_ms": round(latency_ms, 2),
            "timestamp": datetime.utcnow().isoformat(),
        }

# Heartbeat endpoints
@app.put("/tenants/{subdomain}/heartbeat")
async def update_tenant_heartbeat(subdomain: str, request: dict, db: Session = Depends(get_db)):
    """Update tenant heartbeat - creates tenant if it doesn't exist"""
    api_url = request.get("api_url")
    if not api_url:
        raise HTTPException(status_code=400, detail="api_url is required")
    
    tenant = update_heartbeat(db, subdomain, api_url)
    return {
        "status": "updated",
        "tenant_id": tenant.id,
        "last_seen": tenant.last_seen.isoformat() if tenant.last_seen else None
    }

@app.get("/tenants/{subdomain}/status")
async def get_tenant_status_endpoint(subdomain: str, db: Session = Depends(get_db)):
    """Get tenant status (alive/dead based on last heartbeat)"""
    status = get_tenant_status(db, subdomain)
    return status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)