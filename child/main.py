from fastapi import FastAPI, HTTPException, Depends, Request, status, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import os
import logging
import asyncio
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import authentication and middleware
from auth import authenticate_user, create_access_token, get_current_user
from database import get_db
from middleware import get_tenant_from_host, validate_jwt_client_id, require_active_tenant, get_subdomain_from_host
from middleware import ClientSiteMiddleware  # Import the new client site middleware
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
    description="Backend service for child client site"
)

# Add client site middleware FIRST - this handles schema switching
app.add_middleware(ClientSiteMiddleware)

# Add CORS middleware - CRITICAL for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add client site context middleware
@app.middleware("http")
async def add_client_site_context(request: Request, call_next):
    """Add client site context to request state for logging and debugging"""
    try:
        # Extract subdomain from host header
        host = request.headers.get('host', '')
        subdomain = get_subdomain_from_host(host)
        request.state.subdomain = subdomain
        
        # Log client site context for debugging
        logger.info(f"Request from subdomain: {subdomain}, Path: {request.url.path}")
        
    except Exception as e:
        logger.warning(f"Failed to extract client site context: {e}")
    
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
async def get_branding(request: Request, db: AsyncSession = Depends(get_db)):
    """Branding configuration scoped to current tenant"""
    # Get tenant from host for now, bypass authentication for testing
    tenant = await get_tenant_from_host(request, db)
    logger.info(f"[Branding] Getting branding for tenant: {tenant}")
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

@app.get("/api/config")
async def get_api_config(request: Request, db: AsyncSession = Depends(get_db)):
    """API configuration endpoint for frontend compatibility"""
    subdomain = await get_tenant_from_host(request, db)
    client_site = getattr(request.state, 'client_site_info', None)
    logger.info(f"[API Config] Getting config for subdomain: {subdomain}, client_site_info: {client_site}")
    
    # Get client site info from parent service if available
    if client_site and isinstance(client_site, dict):
        client_site_id = client_site.get('id', f"{subdomain}-12345")
        client_site_name = client_site.get('name', f"{subdomain.title()} Property Management")
    else:
        client_site_id = f"{subdomain}-12345"
        client_site_name = f"{subdomain.title()} Property Management"
    
    # Generate tenant-specific configuration based on subdomain
    # Different color schemes for different client sites
    color_schemes = {
        'glam': {
            'primary_color': '#e91e63',
            'brand_palette': ['#e91e63', '#ad1457', '#c2185b', '#f06292', '#f8bbd9', '#fce4ec']
        },
        'dox': {
            'primary_color': '#3f51b5',
            'brand_palette': ['#3f51b5', '#303f9f', '#283593', '#5c6bc0', '#9fa8da', '#e8eaf6']
        },
        'acme': {
            'primary_color': '#ff9800',
            'brand_palette': ['#ff9800', '#f57c00', '#ef6c00', '#ffb74d', '#ffe0b2', '#fff3e0']
        },
        'default': {
            'primary_color': '#667eea',
            'brand_palette': ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
        }
    }
    
    # Get color scheme for this subdomain
    scheme = color_schemes.get(subdomain.lower(), color_schemes['default'])
    logger.info(f"[API Config] Detected subdomain: '{subdomain}', selected scheme: {scheme}")
    logger.info(f"[API Config] Available color schemes: {list(color_schemes.keys())}")
    
    return {
        "id": client_site_id,
        "app_title": client_site_name,
        "logo_url": f"/assets/{subdomain}/logo.png",
        "favicon_url": f"/assets/{subdomain}/favicon.png",
        "font_family": "Inter, sans-serif",
        "primary_color": scheme['primary_color'],
        "brand_palette": scheme['brand_palette'],
        "dark_mode_default": False,
        "theme_overrides": {},
        "tenant": {
            "id": client_site_id,
            "name": client_site_name,
            "subdomain": subdomain,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }

@app.get("/api/tenants")
async def get_api_tenants(request: Request, db: AsyncSession = Depends(get_db)):
    """API tenants endpoint for frontend compatibility"""
    subdomain = await get_tenant_from_host(request, db)
    client_site = getattr(request.state, 'client_site_info', None)
    logger.info(f"[API Tenants] Getting tenants for subdomain: {subdomain}")
    
    # Get client site info from parent service if available
    if client_site and isinstance(client_site, dict):
        client_site_id = client_site.get('id', f"{subdomain}-12345")
        client_site_name = client_site.get('name', f"{subdomain.title()} Property Management")
    else:
        client_site_id = f"{subdomain}-12345"
        client_site_name = f"{subdomain.title()} Property Management"
    
    # Use live database to get actual tenant data for this client site
    from sqlalchemy import select
    from database import DBTenant, DBTenancy, IS_SQLITE
    
    # Get all tenants for this client site with their current tenancies
    tenant_query = select(DBTenant).where(DBTenant.client_site_id == client_site_id)
    
    if IS_SQLITE:
        # For SQLite, use sync execution
        result = db.execute(tenant_query)
        tenants = result.scalars().all()
    else:
        # For PostgreSQL, use async execution
        result = await db.execute(tenant_query)
        tenants = result.scalars().all()
    
    tenant_list = []
    for tenant in tenants:
        # Get current tenancy for this tenant
        tenancy_query = select(DBTenancy).where(DBTenancy.tenant_id == tenant.id).where(DBTenancy.end_date.is_(None)).order_by(DBTenancy.created_at.desc())
        
        if IS_SQLITE:
            tenancy_result = db.execute(tenancy_query)
            current_tenancy = tenancy_result.scalars().first()
        else:
            tenancy_result = await db.execute(tenancy_query)
            current_tenancy = tenancy_result.scalars().first()
        
        tenant_list.append({
            "id": tenant.id,
            "name": tenant.name,
            "email": tenant.email,
            "phone": tenant.phone,
            "date_of_birth": tenant.date_of_birth,
            "employment_status": tenant.employment_status,
            "created_at": tenant.created_at.isoformat(),
            "updated_at": tenant.updated_at.isoformat(),
            "current_property_id": current_tenancy.property_id if current_tenancy else None,
            "tenancy_status": current_tenancy.status if current_tenancy else None
        })
    
    return {
        "tenants": tenant_list,
        "client_site": {
            "id": client_site_id,
            "name": client_site_name,
            "subdomain": subdomain
        }
    }

@app.get("/properties")
async def list_properties(
    skip: int = 0, 
    limit: int = 50, 
    sort_by: str = "updated", 
    order: str = "desc",
    auth_context: dict = Depends(validate_jwt_client_id),
    db: AsyncSession = Depends(get_db)
):
    """List properties scoped to authenticated tenant"""
    tenant = auth_context.get("tenant", {})
    subdomain = tenant.get("subdomain", "localhost")
    client_site_id = str(tenant.get("id", f"{subdomain}-12345"))
    
    # Use live database query with client_site_id filtering
    from sqlalchemy import select
    from database import DBProperty, IS_SQLITE
    
    # Build query with tenant isolation
    query = select(DBProperty).where(DBProperty.client_site_id == client_site_id)
    
    # Apply sorting
    if sort_by == "updated":
        query = query.order_by(DBProperty.updated_at.desc() if order == "desc" else DBProperty.updated_at.asc())
    elif sort_by == "created":
        query = query.order_by(DBProperty.created_at.desc() if order == "desc" else DBProperty.created_at.asc())
    elif sort_by == "title":
        query = query.order_by(DBProperty.title.desc() if order == "desc" else DBProperty.title.asc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    if IS_SQLITE:
        # For SQLite, use sync execution
        result = db.execute(query)
        properties = result.scalars().all()
    else:
        # For PostgreSQL, use async execution
        result = await db.execute(query)
        properties = result.scalars().all()
    
    # Convert to response format
    return [
        {
            "id": prop.id,
            "title": prop.title,
            "description": prop.description or "No description available",
            "address": prop.address,
            "property_type": prop.acf.get("profilegroup", {}).get("property_type", "unknown") if prop.acf else "unknown",
            "bedrooms": prop.acf.get("profilegroup", {}).get("beds", 0) if prop.acf else 0,
            "bathrooms": prop.acf.get("profilegroup", {}).get("bathrooms", 0) if prop.acf else 0,
            "area_sqft": prop.acf.get("profilegroup", {}).get("area_sqft", 0) if prop.acf else 0,
            "price": prop.acf.get("financial_group", {}).get("rent_to_landord", 0) if prop.acf else 0,
            "status": "available",  # Default status
            "images": prop.acf.get("gallery_photos", []) if prop.acf and isinstance(prop.acf.get("gallery_photos"), list) else [],
            "is_published": prop.published,
            "featured": False,  # Default featured status
            "tenant_context": subdomain,
            "client_site_id": prop.client_site_id,
            "created_at": prop.created_at.isoformat(),
            "updated_at": prop.updated_at.isoformat()
        }
        for prop in properties
    ]

@app.get("/properties/{property_id}")
async def get_property(property_id: str, auth_context: dict = Depends(validate_jwt_client_id), db: AsyncSession = Depends(get_db)):
    """Get individual property by ID"""
    tenant = auth_context.get("tenant", {})
    subdomain = tenant.get("subdomain", "localhost")
    client_site_id = str(tenant.get("id", f"{subdomain}-12345"))
    
    # Use live database query with tenant isolation
    from sqlalchemy import select
    from database import DBProperty, IS_SQLITE
    
    # Query property by ID with client_site_id filtering for tenant isolation
    query = select(DBProperty).where(
        DBProperty.id == property_id,
        DBProperty.client_site_id == client_site_id
    )
    
    if IS_SQLITE:
        # For SQLite, use sync execution
        result = db.execute(query)
        prop = result.scalar()
    else:
        # For PostgreSQL, use async execution
        result = await db.execute(query)
        prop = result.scalar()
    
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Return property data in expected format
    return {
        "id": prop.id,
        "title": prop.title,
        "description": prop.description or "No description available",
        "address": prop.address,
        "property_type": prop.acf.get("profilegroup", {}).get("property_type", "unknown") if prop.acf else "unknown",
        "bedrooms": prop.acf.get("profilegroup", {}).get("beds", 0) if prop.acf else 0,
        "bathrooms": prop.acf.get("profilegroup", {}).get("bathrooms", 0) if prop.acf else 0,
        "area_sqft": prop.acf.get("profilegroup", {}).get("area_sqft", 0) if prop.acf else 0,
        "price": prop.acf.get("financial_group", {}).get("rent_to_landord", 0) if prop.acf else 0,
        "status": "available",  # Default status
        "images": prop.acf.get("gallery_photos", []) if prop.acf and isinstance(prop.acf.get("gallery_photos"), list) else [],
        "is_published": prop.published,
        "featured": False,  # Default featured status
        "tenant_context": subdomain,
        "client_site_id": prop.client_site_id,
        "created_at": prop.created_at.isoformat(),
        "updated_at": prop.updated_at.isoformat(),
        "content": prop.content,
        "owner_id": prop.owner_id,
        "tenant_info": prop.tenant_info,
        "financial_info": prop.financial_info,
        "maintenance_records": prop.maintenance_records,
        "documents": prop.documents,
        "inspections": prop.inspections,
        "acf": prop.acf
    }

async def execute_db_query(db, query, is_sqlite=False):
    """Helper function to execute database queries for both SQLite (sync) and PostgreSQL (async)"""
    if is_sqlite:
        # For SQLite, use sync execution
        result = db.execute(query)
        return result
    else:
        # For PostgreSQL, use async execution
        result = await db.execute(query)
        return result

@app.get("/dashboard/stats")
async def get_dashboard_stats(auth_context: dict = Depends(validate_jwt_client_id), db: AsyncSession = Depends(get_db)):
    """Dashboard statistics with live data from database"""
    tenant = auth_context.get("tenant", {})
    subdomain = tenant.get("subdomain", "localhost")
    client_site_id = str(tenant.get("id", f"{subdomain}-12345"))
    
    # Use live database queries for statistics
    from sqlalchemy import select, func, and_
    from database import DBProperty, DBTenant, DBTenancy, Payment, IS_SQLITE
    
    if subdomain == "localhost":
        # Parent context - show aggregated stats across all client sites
        # Count total properties
        properties_result = await execute_db_query(db, select(func.count(DBProperty.id)), IS_SQLITE)
        total_properties = properties_result.scalar() or 0
        
        # Count available properties (published)
        available_result = await execute_db_query(db, select(func.count(DBProperty.id)).where(DBProperty.published == True), IS_SQLITE)
        available_properties = available_result.scalar() or 0
        
        # Count total tenants
        tenants_result = await execute_db_query(db, select(func.count(DBTenant.id)).where(DBTenant.client_site_id == client_site_id), IS_SQLITE)
        total_tenants = tenants_result.scalar() or 0
        
        # Count active tenants (with current tenancy)
        active_tenants_result = await execute_db_query(db, 
            select(func.count(func.distinct(DBTenancy.tenant_id)))
            .join(DBTenant, DBTenancy.tenant_id == DBTenant.id)
            .where(and_(DBTenant.client_site_id == client_site_id, DBTenancy.end_date.is_(None))), IS_SQLITE)
        active_tenants = active_tenants_result.scalar() or 0
        
        # Calculate revenue (sum of all payments for this client site)
        revenue_result = await execute_db_query(db, 
            select(func.sum(Payment.amount))
            .join(DBProperty, Payment.property_id == DBProperty.id)
            .where(DBProperty.client_site_id == client_site_id), IS_SQLITE)
        total_revenue = float(revenue_result.scalar() or 0)
        
        # Count client sites (just this one)
        tenant_count = 1
        
        return {
            "total_properties": total_properties,
            "available_properties": available_properties,
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "total_revenue": total_revenue,
            "monthly_revenue": total_revenue * 0.5,  # Approximate monthly
            "pending_maintenance": 0,  # Would need maintenance table
            "overdue_rent": 0,  # Would need rent tracking
            "context": "parent",
            "tenant_count": tenant_count
        }
    else:
        # Child context - show tenant-specific stats
        # Count properties for this client site
        properties_result = await execute_db_query(db, select(func.count(DBProperty.id)).where(DBProperty.client_site_id == client_site_id), IS_SQLITE)
        total_properties = properties_result.scalar() or 0
        
        # Count available properties for this client site
        available_result = await execute_db_query(db, select(func.count(DBProperty.id)).where(and_(DBProperty.client_site_id == client_site_id, DBProperty.published == True)), IS_SQLITE)
        available_properties = available_result.scalar() or 0
        
        # Count tenants for this client site
        tenants_result = await execute_db_query(db, select(func.count(DBTenant.id)).where(DBTenant.client_site_id == client_site_id), IS_SQLITE)
        total_tenants = tenants_result.scalar() or 0
        
        # Count active tenants for this client site
        active_tenants_result = await execute_db_query(db, 
            select(func.count(func.distinct(DBTenancy.tenant_id)))
            .join(DBTenant, DBTenancy.tenant_id == DBTenant.id)
            .where(
                and_(
                    DBTenant.client_site_id == client_site_id,
                    DBTenancy.end_date.is_(None)
                )
            ), IS_SQLITE)
        active_tenants = active_tenants_result.scalar() or 0
        
        # Calculate revenue for this client site
        revenue_result = await execute_db_query(db, 
            select(func.sum(Payment.amount))
            .join(DBProperty, Payment.property_id == DBProperty.id)
            .where(DBProperty.client_site_id == client_site_id), IS_SQLITE)
        total_revenue = float(revenue_result.scalar() or 0)
        
        return {
            "total_properties": total_properties,
            "available_properties": available_properties,
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "total_revenue": total_revenue,
            "monthly_revenue": total_revenue * 0.5,  # Approximate monthly
            "pending_maintenance": 0,  # Would need maintenance table
            "overdue_rent": 0,  # Would need rent tracking
            "context": subdomain
        }

@app.post("/auth/login")
async def login(credentials: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Login endpoint with proper authentication and client_id in JWT"""
    # Get tenant context from Host header
    try:
        tenant = await get_tenant_from_host(request, db)
    except HTTPException as e:
        raise e
    
    # Get client site info from request state (set by middleware)
    client_site_info = getattr(request.state, 'client_site_info', None)
    client_site_id = client_site_info.get('id') if client_site_info else tenant
    
    # Development mode: bypass authentication for testing
    if os.getenv("ENVIRONMENT") == "development":
        # Check for admin pattern: admin@<subdomain>.localhost with password <subdomain>123
        import re
        admin_pattern = r'^admin@([a-zA-Z0-9-]+)\.localhost$'
        match = re.match(admin_pattern, credentials.email)
        
        if match:
            subdomain = match.group(1)
            expected_password = f"{subdomain}123"
            
            if credentials.password == expected_password:
                logger.info(f"[Development Login] Bypassing authentication for {credentials.email} (subdomain: {subdomain})")
                # Create access token with client_id from tenant context
                access_token = create_access_token(
                    data={"sub": credentials.email},
                    client_id=str(client_site_id)
                )
                
                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "id": 1,
                        "email": credentials.email,
                        "username": f"admin_{subdomain}",
                        "role": "propertyadmin",
                        "is_active": True,
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
    
    # Production mode: authenticate against database
    user = await authenticate_user(db, credentials.email, credentials.password, str(client_site_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token with client_id
    access_token = create_access_token(
        data={"sub": user.email},
        client_id=str(client_site_id)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "client_id": client_site_id,
            "tenant": tenant
        }
    }

# Alternative auth endpoints that frontend might use
@app.post("/token")
async def token_login(username: str = Form(...), password: str = Form(...)):
    """Alternative token endpoint for frontend compatibility - accepts form data"""
    return {
        "access_token": "mock-jwt-token-for-child-service",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "email": f"{username}@example.com",
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
async def get_current_user(request: Request, auth_context: dict = Depends(validate_jwt_client_id)):
    """Get current user with tenant context validation"""
    # Get user info from auth context
    # Enforce client site header if middleware didn't run
    if not getattr(request.state, "client_site", None):
        header_subdomain = request.headers.get("X-Client-Site-ID") or request.query_params.get("subdomain")
        if not header_subdomain:
            raise HTTPException(status_code=400, detail="X-Client-Site-ID header is required")

    user_email = auth_context.get("user")
    tenant = auth_context.get("tenant")
    if not user_email or not tenant:
        raise HTTPException(status_code=401, detail="Invalid authentication context")
    
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
async def get_users_me(request: Request, auth_context: dict = Depends(validate_jwt_client_id)):
    """Get current user with tenant context validation"""
    logger.info(f"[get_users_me] Auth context: {auth_context}")
    logger.info(f"[get_users_me] Request state client_site: {getattr(request.state, 'client_site', None)}")
    
    # Enforce client site header if middleware didn't run
    if not getattr(request.state, "client_site", None):
        header_subdomain = request.headers.get("X-Client-Site-ID") or request.query_params.get("subdomain")
        if not header_subdomain:
            raise HTTPException(status_code=400, detail="X-Client-Site-ID header is required")

    user_email = auth_context.get("user")
    tenant = auth_context.get("tenant")
    logger.info(f"[get_users_me] Extracted user_email: {user_email}, tenant: {tenant}")
    
    if not user_email or not tenant:
        logger.error(f"[get_users_me] Invalid authentication context - missing user_email or tenant")
        raise HTTPException(status_code=401, detail="Invalid authentication context")
    
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

# Admin user management endpoints
class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "admin"
    is_active: bool = True
    tenant_id: str
    subdomain: str

@app.post("/api/admin/users")
async def create_admin_user(user: AdminUserCreate, request: Request):
    """Create admin user for a tenant - used by parent service during tenant provisioning"""
    try:
        # Verify this is an internal service request
        internal_service = request.headers.get("X-Internal-Service")
        if not internal_service:
            raise HTTPException(status_code=403, detail="Internal service header required")
        
        subdomain = request.headers.get("X-Client-Site-ID") or user.subdomain
        client_site_id = request.headers.get("X-Client-Site-UUID") or user.client_site_id
        
        logger.info(f"Creating admin user for client site '{subdomain}' with ID {client_site_id}")
        
        # For now, return success - in production this would create the user in tenant-specific schema
        return {
            "id": f"admin_{subdomain}_{tenant_id}",
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "tenant_id": tenant_id,
            "subdomain": subdomain,
            "created_at": datetime.utcnow().isoformat(),
            "message": f"Admin user '{user.username}' created for tenant '{subdomain}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create admin user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create admin user: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)