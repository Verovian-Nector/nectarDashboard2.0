from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import os
import sys
import logging
import jwt
from passlib.context import CryptContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db, engine, Base
from crud import (
    create_client_site, get_client_site, get_client_site_by_subdomain, list_client_sites, activate_client_site, deactivate_client_site,
    update_heartbeat, get_client_site_status, ClientSiteCreate, ClientSiteResponse, ClientSiteActivationResponse, list_events, ClientSiteEventResponse, log_event
)
from client_site_service import ClientSiteProvisioningService
from config import settings
from cloudflare_service import cloudflare_service
from ssl_cert_manager import create_ssl_certificate_manager
from monitoring_endpoints import router as monitoring_router
from models import AdminUser

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Parent Backend", version="1.0.0")

# Include monitoring endpoints
app.include_router(monitoring_router)

# Add CORS middleware - CRITICAL for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set environment variable to bypass client site validation for auth endpoints
import os
os.environ["BYPASS_CLIENT_SITE_VALIDATION"] = "true"

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str

class CloudflareHealthResponse(BaseModel):
    configured: bool
    zone_info: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ConfigResponse(BaseModel):
    main_domain: str
    child_service_port: int
    base_url: str
    child_service_base_url_template: str

class HealthProxyResponse(BaseModel):
    status: str
    latency_ms: float
    timestamp: str

class TenantProvisioningRequest(BaseModel):
    subdomain: str
    name: str
    settings: Optional[Dict[str, Any]] = None

class TenantProvisioningResponse(BaseModel):
    id: str
    subdomain: str
    name: str
    status: str
    is_active: bool
    created_at: str
    message: str

class CertificateStatusResponse(BaseModel):
    domain: str
    exists: bool
    needs_renewal: bool
    expiry_date: Optional[str] = None
    days_until_expiry: Optional[int] = None

class CertificateProvisioningResponse(BaseModel):
    success: bool
    message: str
    domain: str
    certificate_status: Optional[CertificateStatusResponse] = None

class TenantStatusResponse(BaseModel):
    id: str
    subdomain: str
    name: str
    status: str
    is_active: bool
    created_at: str
    updated_at: str
    last_seen: Optional[str]
    settings: Optional[Dict[str, Any]]
    latest_provisioning_log: Optional[Dict[str, Any]]

@app.get("/health", response_model=HealthResponse)
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "parent-backend"
    }

@app.get("/health/cloudflare", response_model=CloudflareHealthResponse)
async def cloudflare_health():
    """Check Cloudflare API connectivity and configuration"""
    try:
        if not cloudflare_service.is_configured():
            return {
                "configured": False,
                "error": "Cloudflare API not configured"
            }
        
        zone_info = await cloudflare_service.get_zone_info()
        return {
            "configured": True,
            "zone_info": zone_info
        }
    except Exception as e:
        return {
            "configured": False,
            "error": str(e)
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

@app.post("/client-sites", response_model=ClientSiteResponse)
async def create_new_client_site(client_site: ClientSiteCreate, db: Session = Depends(get_db)):
    """Create a new client site"""
    db_client_site = get_client_site_by_subdomain(db, client_site.subdomain)
    if db_client_site:
        raise HTTPException(status_code=400, detail="Subdomain already registered")
    return create_client_site(db, client_site)

@app.get("/client-sites", response_model=List[ClientSiteResponse])
async def get_client_sites(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all client sites"""
    client_sites = list_client_sites(db, skip=skip, limit=limit)
    return client_sites

@app.get("/client-sites/{client_site_id}", response_model=ClientSiteResponse)
async def get_client_site_by_id(client_site_id: str, db: Session = Depends(get_db)):
    """Get client site by ID"""
    client_site = get_client_site(db, client_site_id)
    if not client_site:
        raise HTTPException(status_code=404, detail="Client site not found")
    return client_site

@app.get("/client-sites/{client_site_id}/events", response_model=List[ClientSiteEventResponse])
async def get_client_site_events(client_site_id: str, db: Session = Depends(get_db)):
    client_site = get_client_site(db, client_site_id)
    if not client_site:
        raise HTTPException(status_code=404, detail="Client site not found")
    events = list_events(db, client_site_id)
    return events

@app.post("/client-sites/{client_site_id}/deactivate", response_model=ClientSiteActivationResponse)
async def deactivate_client_site_endpoint(client_site_id: str, db: Session = Depends(get_db)):
    """Deactivate a client site"""
    client_site = deactivate_client_site(db, client_site_id)
    if not client_site:
        raise HTTPException(status_code=404, detail="Client site not found")
    return {
        "status": "deactivated",
        "activated_at": datetime.utcnow().isoformat()
    }

@app.post("/client-sites/{tenant_id}/activate", response_model=ClientSiteActivationResponse)
async def activate_tenant_endpoint(tenant_id: str, db: Session = Depends(get_db)):
    """Activate a client site"""
    tenant = activate_client_site(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Client site not found")
    return {
        "status": "activated",
        "activated_at": datetime.utcnow().isoformat()
    }

@app.get("/client-sites/{tenant_id}/health", response_model=HealthProxyResponse)
async def proxy_tenant_health(tenant_id: str, db: Session = Depends(get_db)):
    tenant = get_client_site(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Client site not found")
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
@app.put("/client-sites/{subdomain}/heartbeat")
async def update_tenant_heartbeat(subdomain: str, request: dict, db: Session = Depends(get_db)):
    """Update client site heartbeat - creates client site if it doesn't exist"""
    api_url = request.get("api_url")
    if not api_url:
        raise HTTPException(status_code=400, detail="api_url is required")
    
    tenant = update_heartbeat(db, subdomain, api_url)
    return {
        "status": "updated",
        "tenant_id": tenant.id,
        "last_seen": tenant.last_seen.isoformat() if tenant.last_seen else None
    }

@app.get("/client-sites/{subdomain}/status")
async def get_tenant_status_endpoint(subdomain: str, db: Session = Depends(get_db)):
    """Get client site status (alive/dead based on last heartbeat)"""
    status = get_tenant_status(db, subdomain)
    return status

# NEW: Tenant Provisioning Endpoints
@app.post("/client-sites/provision", response_model=TenantProvisioningResponse)
async def provision_tenant(request: TenantProvisioningRequest, db: Session = Depends(get_db)):
    """Provision a new client site with database schema and all configurations"""
    try:
        service = ClientSiteProvisioningService(db)
        tenant = await service.create_client_site(
            subdomain=request.subdomain,
            name=request.name,
            settings=request.settings
        )
        
        return TenantProvisioningResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            name=tenant.name,
            status=tenant.status,
            is_active=tenant.is_active,
            created_at=tenant.created_at.isoformat(),
            message=f"Client site '{request.subdomain}' provisioned successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to provision client site '{request.subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to provision tenant")

@app.get("/client-sites/{subdomain}/provision-status", response_model=TenantStatusResponse)
async def get_tenant_provision_status(subdomain: str, db: Session = Depends(get_db)):
    """Get comprehensive client site provisioning status"""
    try:
        service = ClientSiteProvisioningService(db)
        status = await service.get_client_site_status(subdomain)
        return TenantStatusResponse(**status)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get client site status for '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get tenant status")

@app.put("/client-sites/{subdomain}/suspend", response_model=TenantProvisioningResponse)
async def suspend_tenant_endpoint(subdomain: str, db: Session = Depends(get_db)):
    """Suspend a client site (disable access but keep data)"""
    try:
        service = ClientSiteProvisioningService(db)
        tenant = await service.suspend_client_site(subdomain)
        
        return TenantProvisioningResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            name=tenant.name,
            status=tenant.status,
            is_active=tenant.is_active,
            created_at=tenant.created_at.isoformat(),
            message=f"Client site '{subdomain}' suspended successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to suspend client site '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to suspend tenant")

@app.put("/client-sites/{subdomain}/activate", response_model=TenantProvisioningResponse)
async def activate_tenant_endpoint(subdomain: str, db: Session = Depends(get_db)):
    """Activate a suspended client site"""
    try:
        service = ClientSiteProvisioningService(db)
        tenant = await service.activate_client_site(subdomain)
        
        return TenantProvisioningResponse(
            id=str(tenant.id),
            subdomain=tenant.subdomain,
            name=tenant.name,
            status=tenant.status,
            is_active=tenant.is_active,
            created_at=tenant.created_at.isoformat(),
            message=f"Client site '{subdomain}' activated successfully"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to activate client site '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to activate tenant")

@app.delete("/client-sites/{subdomain}", response_model=TenantProvisioningResponse)
async def delete_tenant_endpoint(subdomain: str, db: Session = Depends(get_db)):
    """Delete a client site and all its data (irreversible)"""
    try:
        service = ClientSiteProvisioningService(db)
        success = await service.delete_client_site(subdomain)
        
        if success:
            return TenantProvisioningResponse(
                id="",  # Tenant is deleted, no ID
                subdomain=subdomain,
                name="",
                status="deleted",
                is_active=False,
                created_at=datetime.utcnow().isoformat(),
                message=f"Client site '{subdomain}' deleted successfully"
            )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete client site '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete tenant")

# SSL Certificate Management Endpoints
@app.get("/certificates/{subdomain}/status", response_model=CertificateStatusResponse)
async def get_certificate_status(subdomain: str):
    """Get SSL certificate status for a subdomain"""
    try:
        cert_manager = create_ssl_certificate_manager()
        if not cert_manager:
            raise HTTPException(status_code=503, detail="Certificate manager not configured")
        
        status = cert_manager.get_certificate_status(subdomain)
        return CertificateStatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get certificate status for '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get certificate status")

@app.post("/certificates/{subdomain}/issue", response_model=CertificateProvisioningResponse)
async def issue_certificate(subdomain: str):
    """Issue a new SSL certificate for a subdomain"""
    try:
        cert_manager = create_ssl_certificate_manager()
        if not cert_manager:
            raise HTTPException(status_code=503, detail="Certificate manager not configured")
        
        success, message = cert_manager.issue_certificate(subdomain)
        status = cert_manager.get_certificate_status(subdomain)
        
        return CertificateProvisioningResponse(
            success=success,
            message=message,
            domain=f"{subdomain}.{cert_manager.domain}",
            certificate_status=CertificateStatusResponse(**status) if status["exists"] else None
        )
    except Exception as e:
        logger.error(f"Failed to issue certificate for '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to issue certificate")

@app.post("/certificates/{subdomain}/renew", response_model=CertificateProvisioningResponse)
async def renew_certificate(subdomain: str):
    """Renew an existing SSL certificate for a subdomain"""
    try:
        cert_manager = create_ssl_certificate_manager()
        if not cert_manager:
            raise HTTPException(status_code=503, detail="Certificate manager not configured")
        
        success, message = cert_manager.renew_certificate(subdomain)
        status = cert_manager.get_certificate_status(subdomain)
        
        return CertificateProvisioningResponse(
            success=success,
            message=message,
            domain=f"{subdomain}.{cert_manager.domain}",
            certificate_status=CertificateStatusResponse(**status) if status["exists"] else None
        )
    except Exception as e:
        logger.error(f"Failed to renew certificate for '{subdomain}': {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to renew certificate")

@app.post("/certificates/wildcard/issue", response_model=CertificateProvisioningResponse)
async def issue_wildcard_certificate():
    """Issue a wildcard SSL certificate for all client site subdomains"""
    try:
        cert_manager = create_ssl_certificate_manager()
        if not cert_manager:
            raise HTTPException(status_code=503, detail="Certificate manager not configured")
        
        success, message = cert_manager.issue_wildcard_certificate()
        status = cert_manager.get_certificate_status("*")
        
        return CertificateProvisioningResponse(
            success=success,
            message=message,
            domain=f"*.{cert_manager.domain}",
            certificate_status=CertificateStatusResponse(**status) if status["exists"] else None
        )
    except Exception as e:
        logger.error(f"Failed to issue wildcard certificate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to issue wildcard certificate")

@app.get("/certificates/health")
async def certificate_health():
    """Check SSL certificate management system health"""
    try:
        cert_manager = create_ssl_certificate_manager()
        if not cert_manager:
            return {
                "status": "not_configured",
                "message": "Certificate manager not configured - check environment variables"
            }
        
        # Test by checking admin certificate status
        admin_status = cert_manager.get_certificate_status("admin")
        
        return {
            "status": "healthy",
            "message": "Certificate management system is operational",
            "admin_certificate": admin_status,
            "configured": True
        }
    except Exception as e:
        logger.error(f"Certificate health check failed: {str(e)}")
        return {
            "status": "error",
            "message": f"Certificate health check failed: {str(e)}",
            "configured": False
        }

# Authentication Endpoints
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login endpoint to get access token"""
    # Get user from database
    user = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=1440)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: AdminUser = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active
    }

# Branding Management Endpoints
class BrandSettingsResponse(BaseModel):
    id: str
    app_title: str
    logo_url: Optional[str]
    favicon_url: Optional[str]
    font_family: str
    primary_color: str
    brand_palette: List[str]
    dark_mode_default: bool
    theme_overrides: Dict[str, Any]
    created_at: str
    updated_at: str

class BrandSettingsUpdate(BaseModel):
    app_title: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    font_family: Optional[str] = None
    primary_color: Optional[str] = None
    brand_palette: Optional[List[str]] = None
    dark_mode_default: Optional[bool] = None
    theme_overrides: Optional[Dict[str, Any]] = None

# In-memory branding storage for now (can be moved to database later)
branding_storage = {
    "id": "default",
    "app_title": "Nectar Estate",
    "logo_url": None,
    "favicon_url": None,
    "font_family": "Asap, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
    "primary_color": "#2A7B88",
    "brand_palette": ["#2A7B88", "#eaf4f6", "#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#6c757d", "#495057", "#15414b"],
    "dark_mode_default": False,
    "theme_overrides": {},
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
}

@app.get("/branding", response_model=BrandSettingsResponse)
async def get_branding():
    """Get current branding settings"""
    return branding_storage

@app.put("/branding", response_model=BrandSettingsResponse)
async def update_branding(settings: BrandSettingsUpdate):
    """Update branding settings"""
    # Update only provided fields
    for field, value in settings.dict(exclude_unset=True).items():
        branding_storage[field] = value
    
    # Update timestamp
    branding_storage["updated_at"] = datetime.utcnow().isoformat()
    
    return branding_storage

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)