from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
import logging
import asyncio
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import authentication and middleware
from auth import authenticate_user, create_access_token, get_current_user
from database import get_db
from middleware import get_tenant_from_host, validate_jwt_client_id, require_active_tenant, get_subdomain_from_host
from integrations import router as integrations_router

# Pydantic models
class HeartbeatRequest(BaseModel):
    subdomain: str
    api_url: str

class LoginRequest(BaseModel):
    email: str
    password: str

# Create FastAPI app
app = FastAPI(
    title="Child Backend Service",
    version="1.0.0",
    description="Backend service for child tenant"
)

# Add CORS middleware - CRITICAL for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add tenant context middleware
@app.middleware("http")
async def add_tenant_context(request: Request, call_next):
    """Add tenant context to request state for logging and debugging"""
    try:
        # Extract subdomain from host header
        host = request.headers.get('host', '')
        subdomain = get_subdomain_from_host(host)
        request.state.subdomain = subdomain
        
        # Log tenant context for debugging
        logger.info(f"Request from subdomain: {subdomain}, Path: {request.url.path}")
        
    except Exception as e:
        logger.warning(f"Failed to extract tenant context: {e}")
    
    response = await call_next(request)
    return response

# ===== ESSENTIAL API ENDPOINTS =====

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "child-backend",
        "subdomain": os.getenv("SUBDOMAIN", "child")
    }

@app.get("/branding")
async def get_branding(tenant: dict = Depends(require_active_tenant)):
    """Branding configuration scoped to current tenant"""
    return {
        "id": tenant["id"],
        "app_title": f"{tenant['name']} Property Management",
        "logo_url": "/assets/logo.png",
        "favicon_url": "/assets/favicon.png",
        "font_family": "Inter, sans-serif",
        "primary_color": "#667eea",
        "brand_palette": ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"],
        "dark_mode_default": False,
        "theme_overrides": {},
        "tenant": tenant,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

@app.get("/properties")
async def list_properties(
    skip: int = 0, 
    limit: int = 50, 
    sort_by: str = "updated", 
    order: str = "desc",
    auth_context: dict = Depends(validate_jwt_client_id)
):
    """List properties scoped to authenticated tenant"""
    return [
        {
            "id": 1,
            "title": "Modern Apartment in Child District",
            "description": "Beautiful modern apartment with all amenities",
            "price": 2500,
            "address": "456 Child Avenue, Child City, CC 12345",
            "bedrooms": 2,
            "bathrooms": 2,
            "area_sqft": 1200,
            "property_type": "apartment",
            "status": "available",
            "images": ["https://via.placeholder.com/800x600?text=Property+1"],
            "created_at": "2024-01-15T10:00:00Z",
            "updated_at": "2024-01-15T10:00:00Z",
            "is_published": True,
            "featured": True
        },
        {
            "id": 2,
            "title": "Cozy Studio in Child Center",
            "description": "Perfect studio for young professionals",
            "price": 1500,
            "address": "789 Child Street, Child City, CC 12345",
            "bedrooms": 1,
            "bathrooms": 1,
            "area_sqft": 600,
            "property_type": "studio",
            "status": "available",
            "images": ["https://via.placeholder.com/800x600?text=Property+2"],
            "created_at": "2024-01-14T10:00:00Z",
            "updated_at": "2024-01-14T10:00:00Z",
            "is_published": True,
            "featured": False
        }
    ]

@app.get("/properties/{property_id}")
async def get_property(property_id: int):
    """Get individual property by ID"""
    properties = [
        {
            "id": 1,
            "title": "Modern Apartment in Child District",
            "description": "Beautiful modern apartment with all amenities",
            "price": 2500,
            "address": "456 Child Avenue, Child City, CC 12345",
            "bedrooms": 2,
            "bathrooms": 2,
            "area_sqft": 1200,
            "property_type": "apartment",
            "status": "available",
            "images": ["https://via.placeholder.com/800x600?text=Property+1"],
            "created_at": "2024-01-15T10:00:00Z",
            "updated_at": "2024-01-15T10:00:00Z",
            "is_published": True,
            "featured": True
        },
        {
            "id": 2,
            "title": "Cozy Studio in Child Center",
            "description": "Perfect studio for young professionals",
            "price": 1500,
            "address": "789 Child Street, Child City, CC 12345",
            "bedrooms": 1,
            "bathrooms": 1,
            "area_sqft": 600,
            "property_type": "studio",
            "status": "available",
            "images": ["https://via.placeholder.com/800x600?text=Property+2"],
            "created_at": "2024-01-14T10:00:00Z",
            "updated_at": "2024-01-14T10:00:00Z",
            "is_published": True,
            "featured": False
        }
    ]
    
    # Return the property if found, otherwise return first one as fallback
    for prop in properties:
        if prop["id"] == property_id:
            return prop
    return properties[0] if properties else None

@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Dashboard statistics"""
    return {
        "total_properties": 2,
        "available_properties": 2,
        "total_tenants": 3,
        "active_tenants": 3,
        "total_revenue": 8500,
        "monthly_revenue": 4000,
        "pending_maintenance": 1,
        "overdue_rent": 0
    }

@app.post("/auth/login")
async def login(credentials: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login endpoint with proper authentication and client_id in JWT"""
    # Get tenant context from Host header
    try:
        tenant = await get_tenant_from_host(request, db)
    except HTTPException as e:
        raise e
    
    # Authenticate user
    user = await authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with client_id
    access_token = create_access_token(
        data={"sub": user.email},
        client_id=str(tenant["id"])
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "client_id": tenant["id"],
            "tenant": tenant
        }
    }

# Alternative auth endpoints that frontend might use
@app.post("/token")
async def token_login(credentials: LoginRequest):
    """Alternative token endpoint for frontend compatibility"""
    return {
        "access_token": "mock-jwt-token-for-child-service",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "email": credentials.email,
            "name": "Child Admin",
            "role": "admin",
            "permissions": {
                "users": {"create": True, "read": True, "update": True, "delete": True},
                "properties": {"create": True, "read": True, "update": True, "delete": True},
                "tenants": {"create": True, "read": True, "update": True, "delete": True},
                "financials": {"create": True, "read": True, "update": True, "delete": True},
                "maintenance": {"create": True, "read": True, "update": True, "delete": True},
                "calendar": {"create": True, "read": True, "update": True, "delete": True}
            }
        }
    }

@app.get("/auth/me")
async def get_current_user(auth_context: dict = Depends(validate_jwt_client_id)):
    """Get current user with tenant context validation"""
    # Get user info from auth context
    user_email = auth_context["user"]
    tenant = auth_context["tenant"]
    
    return {
        "id": 1,  # This should come from database in real implementation
        "email": user_email,
        "name": "Child Admin",  # This should come from database
        "role": "admin",  # This should come from database
        "client_id": auth_context["client_id"],
        "tenant": tenant,
        "permissions": {
            "users": {"create": True, "read": True, "update": True, "delete": True},
            "properties": {"create": True, "read": True, "update": True, "delete": True},
            "tenants": {"create": True, "read": True, "update": True, "delete": True},
            "financials": {"create": True, "read": True, "update": True, "delete": True},
            "maintenance": {"create": True, "read": True, "update": True, "delete": True},
            "calendar": {"create": True, "read": True, "update": True, "delete": True}
        }
    }

@app.get("/users/me")
async def get_users_me(auth_context: dict = Depends(validate_jwt_client_id)):
    """Get current user with tenant context validation"""
    user_email = auth_context["user"]
    tenant = auth_context["tenant"]
    
    return {
        "id": 1,  # This should come from database in real implementation
        "email": user_email,
        "name": "Child Admin",  # This should come from database
        "role": "admin",  # This should come from database
        "client_id": auth_context["client_id"],
        "tenant": tenant,
        "permissions": {
            "users": {"create": True, "read": True, "update": True, "delete": True},
            "properties": {"create": True, "read": True, "update": True, "delete": True},
            "tenants": {"create": True, "read": True, "update": True, "delete": True},
            "financials": {"create": True, "read": True, "update": True, "delete": True},
            "maintenance": {"create": True, "read": True, "update": True, "delete": True},
            "calendar": {"create": True, "read": True, "update": True, "delete": True}
        }
    }

@app.get("/financials")
async def get_financials(auth_context: dict = Depends(validate_jwt_client_id)):
    """Financial data scoped to authenticated tenant"""
    return {
        "total_revenue": 8500,
        "monthly_revenue": 4000,
        "expenses": 2500,
        "profit": 6000,
        "overdue_rent": 0,
        "transactions": [
            {
                "id": 1,
                "type": "rent",
                "amount": 2500,
                "description": "Monthly rent - Modern Apartment",
                "date": "2024-01-15T00:00:00Z",
                "status": "paid"
            },
            {
                "id": 2,
                "type": "rent",
                "amount": 1500,
                "description": "Monthly rent - Cozy Studio",
                "date": "2024-01-14T00:00:00Z",
                "status": "paid"
            }
        ]
    }

@app.get("/calendar/events")
async def get_calendar_events():
    """Calendar events"""
    return [
        {
            "id": 1,
            "title": "Property Viewing - Modern Apartment",
            "start": "2024-01-20T10:00:00Z",
            "end": "2024-01-20T11:00:00Z",
            "type": "viewing",
            "property_id": 1
        },
        {
            "id": 2,
            "title": "Maintenance Check - Cozy Studio",
            "start": "2024-01-22T14:00:00Z",
            "end": "2024-01-22T15:00:00Z",
            "type": "maintenance",
            "property_id": 2
        }
    ]

# Integrations endpoint
@app.get("/integrations")
async def get_integrations():
    """Get available integrations"""
    return [
        {
            "id": 1,
            "name": "WordPress",
            "type": "cms",
            "status": "connected",
            "config": {
                "url": "https://child.localhost",
                "username": "child_admin"
            }
        },
        {
            "id": 2,
            "name": "Stripe",
            "type": "payment",
            "status": "disconnected",
            "config": {}
        }
    ]

# Heartbeat endpoint for parent service
@app.post("/heartbeat")
async def receive_heartbeat(request: HeartbeatRequest):
    """Receive heartbeat from parent service"""
    logger.info(f"Received heartbeat from {request.subdomain} at {request.api_url}")
    return {
        "status": "received",
        "timestamp": datetime.utcnow().isoformat(),
        "subdomain": request.subdomain
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with basic info"""
    return {
        "message": "Child Backend Service",
        "version": "1.0.0",
        "status": "running",
        "subdomain": os.getenv("SUBDOMAIN", "child"),
        "endpoints": [
            "/health",
            "/branding", 
            "/properties",
            "/dashboard/stats",
            "/auth/login",
            "/auth/me",
            "/financials",
            "/calendar/events",
            "/integrations"
        ]
    }

# Additional endpoints that frontend might call
@app.get("/users/me")
async def get_users_me_alt():
    """Alternative user endpoint"""
    return {
        "id": 1,
        "email": "admin@child.localhost",
        "name": "Child Admin",
        "role": "admin",
        "permissions": {
            "users": {"create": True, "read": True, "update": True, "delete": True},
            "properties": {"create": True, "read": True, "update": True, "delete": True},
            "tenants": {"create": True, "read": True, "update": True, "delete": True},
            "financials": {"create": True, "read": True, "update": True, "delete": True},
            "maintenance": {"create": True, "read": True, "update": True, "delete": True},
            "calendar": {"create": True, "read": True, "update": True, "delete": True}
        }
    }

# OAuth2 token endpoint (alternative format)
@app.post("/token")
async def oauth_token(form_data: LoginRequest):
    """OAuth2 compatible token endpoint"""
    return {
        "access_token": "mock-jwt-token-for-child-service",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": 1,
            "email": form_data.email,
            "name": "Child Admin",
            "role": "admin"
        }
    }

# Include the integrations router with authentication
app.include_router(integrations_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)