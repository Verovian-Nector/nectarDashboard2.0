from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
import asyncio
import httpx
import os
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class HeartbeatRequest(BaseModel):
    subdomain: str
    api_url: str

class TenantResponse(BaseModel):
    id: int
    name: str
    subdomain: str
    api_url: str
    is_active: bool
    created_at: datetime
    last_seen: Optional[datetime] = None

# Global variables for heartbeat management
heartbeat_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle with heartbeat"""
    global heartbeat_task
    
    # Startup
    logger.info("Starting child service...")
    
    # Start heartbeat loop
    subdomain = os.getenv("SUBDOMAIN", "child")
    api_url = os.getenv("API_URL", f"http://{subdomain}.localhost:8000")
    parent_url = os.getenv("PARENT_URL", "http://localhost:8001")
    
    logger.info(f"Starting heartbeat for {subdomain} -> {parent_url}")
    heartbeat_task = asyncio.create_task(heartbeat_loop(subdomain, api_url, parent_url))
    
    yield
    
    # Shutdown
    logger.info("Shutting down child service...")
    if heartbeat_task:
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

async def heartbeat_loop(subdomain: str, api_url: str, parent_url: str):
    """Background task to send heartbeat every 30 seconds"""
    logger.info(f"Heartbeat loop started for {subdomain}")
    
    # Wait a bit for services to be ready
    await asyncio.sleep(5)
    
    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                heartbeat_url = f"{parent_url}/tenants/{subdomain}/heartbeat"
                logger.info(f"Sending heartbeat to: {heartbeat_url}")
                
                response = await client.put(
                    heartbeat_url,
                    json={"api_url": api_url}
                )
                
                if response.status_code == 200:
                    logger.info(f"Heartbeat sent successfully: {response.status_code}")
                else:
                    logger.warning(f"Heartbeat failed with status: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Heartbeat failed: {e}")
        
        await asyncio.sleep(30)

# Create FastAPI app
app = FastAPI(
    title="Child Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "child-backend",
        "subdomain": os.getenv("SUBDOMAIN", "child")
    }

# Heartbeat endpoint
@app.post("/heartbeat")
async def receive_heartbeat(request: HeartbeatRequest):
    """Receive heartbeat from child service"""
    logger.info(f"Received heartbeat from {request.subdomain} at {request.api_url}")
    return {
        "status": "received",
        "timestamp": datetime.utcnow().isoformat(),
        "subdomain": request.subdomain
    }

# Basic tenant endpoints for testing
@app.get("/tenants")
async def list_tenants():
    return []

@app.post("/tenants")
async def create_tenant(tenant: TenantResponse):
    return tenant

# Test endpoint
@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify service is working"""
    return {"message": "Child service is working", "timestamp": datetime.utcnow().isoformat()}

# Branding endpoint
@app.get("/branding")
async def get_branding():
    """Return branding configuration for child service"""
    return {
        "site_name": "Child Property Management",
        "primary_color": "#667eea",
        "logo_url": "/assets/logo.png",
        "favicon_url": "/assets/favicon.png",
        "tagline": "Professional Property Management",
        "contact_email": "contact@child.localhost",
        "contact_phone": "+1-555-CHILD",
        "address": "123 Child Street, Child City, CC 12345",
        "social_links": {
            "facebook": "https://facebook.com/childproperty",
            "twitter": "https://twitter.com/childproperty",
            "instagram": "https://instagram.com/childproperty"
        }
    }

# Properties endpoint
@app.get("/properties")
async def list_properties(skip: int = 0, limit: int = 50, sort_by: str = "updated", order: str = "desc"):
    """Return mock properties for child service"""
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

# Dashboard stats endpoint
@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Return dashboard statistics for child service"""
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

# Authentication endpoints
@app.post("/auth/login")
async def login(credentials: dict):
    """Mock login endpoint"""
    return {
        "access_token": "mock-jwt-token-for-child-service",
        "token_type": "bearer",
        "user": {
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
    }

@app.get("/auth/me")
async def get_current_user():
    """Mock current user endpoint"""
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

# Financials endpoints
@app.get("/financials")
async def get_financials():
    """Mock financials data"""
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

# Calendar endpoints
@app.get("/calendar/events")
async def get_calendar_events():
    """Mock calendar events"""
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

# Frontend route - Basic HTML dashboard
@app.get("/")
async def dashboard():
    """Basic frontend dashboard for child service"""
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Child Service Dashboard</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            h1 {
                color: #333;
                margin-bottom: 10px;
                font-size: 2.5em;
                font-weight: 700;
            }
            .subtitle {
                color: #666;
                font-size: 1.2em;
                margin-bottom: 30px;
            }
            .status {
                display: inline-block;
                padding: 10px 20px;
                background: #e8f5e8;
                color: #2d5a2d;
                border-radius: 25px;
                font-weight: 600;
                margin-bottom: 30px;
            }
            .features {
                text-align: left;
                margin: 30px 0;
            }
            .feature {
                padding: 15px;
                margin: 10px 0;
                background: #f8f9fa;
                border-radius: 10px;
                border-left: 4px solid #667eea;
            }
            .api-link {
                display: inline-block;
                padding: 12px 24px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                transition: background 0.3s ease;
            }
            .api-link:hover {
                background: #5a6fd8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Child Service</h1>
            <div class="subtitle">Backend API Service</div>
            <div class="status">✅ Service Active</div>
            
            <div class="features">
                <div class="feature">
                    <strong>🏠 Property Management</strong><br>
                    Complete property management system with tenants, leases, and maintenance
                </div>
                <div class="feature">
                    <strong>📊 Financial Tracking</strong><br>
                    Track rent payments, expenses, and generate financial reports
                </div>
                <div class="feature">
                    <strong>🔧 Maintenance System</strong><br>
                    Manage repair requests and track maintenance activities
                </div>
                <div class="feature">
                    <strong>📅 Calendar Integration</strong><br>
                    Schedule viewings and track important dates
                </div>
            </div>
            
            <a href="/health" class="api-link">🔍 Check API Health</a>
            <br><br>
            <small style="color: #999;">This is a backend service integrated with the parent dashboard</small>
        </div>
    </body>
    </html>
    """

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)