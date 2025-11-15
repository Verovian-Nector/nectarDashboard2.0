from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
import logging
import asyncio
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
async def get_branding():
    """Branding configuration"""
    return {
        "id": 1,
        "app_title": "Child Property Management",
        "logo_url": "/assets/logo.png",
        "favicon_url": "/assets/favicon.png",
        "font_family": "Inter, sans-serif",
        "primary_color": "#667eea",
        "brand_palette": ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"],
        "dark_mode_default": False,
        "theme_overrides": {},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

@app.get("/properties")
async def list_properties(skip: int = 0, limit: int = 50, sort_by: str = "updated", order: str = "desc"):
    """List properties with mock data"""
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
async def login(credentials: LoginRequest):
    """Login endpoint"""
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
async def get_current_user():
    """Get current user"""
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

@app.get("/users/me")
async def get_users_me():
    """Get current user (alternative endpoint)"""
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

@app.get("/financials")
async def get_financials():
    """Financial data"""
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)