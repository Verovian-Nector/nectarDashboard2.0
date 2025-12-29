# middleware.py
import os
import httpx
import logging
import re
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from database import IS_SQLITE
try:
    from database import SessionLocal
except ImportError:
    SessionLocal = None
try:
    from database import AsyncSessionLocal
except ImportError:
    AsyncSessionLocal = None
from typing import Optional
from authlib.jose import jwt, JoseError
from config import settings

logger = logging.getLogger(__name__)

class ClientSiteMiddleware(BaseHTTPMiddleware):
    """Enhanced middleware to handle client site validation and schema switching"""
    
    def __init__(self, app):
        super().__init__(app)
        self.parent_service_url = os.getenv("PARENT_SERVICE_URL", "http://parent:8001")
        self.bypass_validation = os.getenv("BYPASS_CLIENT_SITE_VALIDATION", "false").lower() == "true"
        logger.info(f"ClientSiteMiddleware initialized - bypass_validation: {self.bypass_validation}, parent_service_url: {self.parent_service_url}")
    
    async def dispatch(self, request: Request, call_next):
        # Allow CORS preflight to pass through without tenant validation
        if request.method == "OPTIONS":
            return await call_next(request)

        # Extract subdomain using the same logic as get_tenant_from_host
        host = request.headers.get("host", "")
        subdomain = get_subdomain_from_host(host)
        
        if not subdomain:
            # Check for X-Client-Site-ID header as fallback
            subdomain = request.headers.get("X-Client-Site-ID", "")
        
        if not subdomain:
            # Check for subdomain in query parameters as final fallback
            subdomain = request.query_params.get("subdomain", "")
        
        client_site_subdomain = subdomain
        client_site_uuid = request.headers.get("X-Client-Site-UUID")
        
        # Check if this is an internal service request or bypass is enabled
        internal_service = request.headers.get("X-Internal-Service")
        if internal_service or self.bypass_validation:
            logger.info(f"Request bypassing client site validation (internal: {internal_service}, bypass: {self.bypass_validation})")
            # For bypass mode, try to get client site from header if available, otherwise use default
            if not client_site_subdomain:
                client_site_subdomain = "localhost"  # Default client site for bypass mode
            request.state.client_site = client_site_subdomain
            request.state.client_site_info = None
            return await call_next(request)
        
        # Require client site context early
        if not client_site_subdomain:
            logger.warning("No X-Client-Site-ID header found in request")
            return Response(
                content="X-Client-Site-ID header is required",
                status_code=400
            )

        # Security validation
        if not self.validate_request_security(request):
            return Response(
                content="Security validation failed",
                status_code=400
            )
        
        # Check for header tampering - validate that client site header matches subdomain
        if not self.validate_header_consistency(request, client_site_subdomain):
            return Response(
                content="Header tampering detected - client site header does not match subdomain",
                status_code=400
            )
        
        # Validate client site subdomain format
        if not self.validate_subdomain_format(client_site_subdomain):
            logger.warning(f"Invalid client site subdomain format: {client_site_subdomain}")
            return Response(
                content="Invalid client site subdomain format",
                status_code=400
            )
        
        # Validate client site with parent service
        try:
            client_site_info = await self.validate_client_site_with_parent(client_site_subdomain, client_site_uuid)
            if not client_site_info:
                return Response(
                    content=f"Client site '{client_site_subdomain}' not found or not active",
                    status_code=404
                )
            
            # Store validated client site info in request state
            request.state.client_site_info = client_site_info
            
        except Exception as e:
            logger.error(f"Failed to validate client site '{client_site_subdomain}' with parent service: {str(e)}")
            return Response(
                content="Unable to validate tenant with parent service",
                status_code=503
            )
        
        # Store tenant in request state
        request.state.tenant = client_site_subdomain
        request.state.client_site = client_site_subdomain
        
        # Create tenant-aware session
        if IS_SQLITE:
            # For SQLite, we don't need schema switching
            with SessionLocal() as session:
                try:
                    # Verify connection by querying a basic table
                    result = session.execute(text("SELECT 1"))
                    result.fetchone()
                    
                    # Store session in request state for use in endpoints
                    request.state.db_session = session
                    
                    # Continue with the request
                    response = await call_next(request)
                    return response
                    
                except Exception as e:
                    logger.error(f"Database connection failed for client site '{client_site_subdomain}': {str(e)}")
                    return Response(
                        content="Database connection failed",
                        status_code=500
                    )
        else:
            # For PostgreSQL, use async session and schema switching
            async with AsyncSessionLocal() as session:
                try:
                    # Set search path to tenant schema
                    await session.execute(text(f'SET search_path TO "client_site_{client_site_subdomain}"'))
                    
                    # Verify schema exists by checking if we can query a basic table
                    result = await session.execute(text("SELECT 1"))
                    result.scalar()  # fetchone() is sync, not async - use scalar() instead
                    
                    # Store session in request state for use in endpoints
                    request.state.db = session
                    
                    # Process request
                    response = await call_next(request)
                    
                    # Commit any pending transactions
                    await session.commit()
                    
                    return response
                    
                except Exception as e:
                    logger.error(f"Database error for client site {client_site_subdomain}: {str(e)}")
                    await session.rollback()
                    
                    if "schema" in str(e).lower() and "does not exist" in str(e).lower():
                        return Response(
                            content=f"Client site schema 'client_site_{client_site_subdomain}' does not exist",
                            status_code=404
                        )
                    
                    return Response(
                        content="Internal server error",
                        status_code=500
                    )
                finally:
                    await session.close()

# Dependency to get client-site-aware database session
if IS_SQLITE:
    def get_client_site_db(request: Request):
        """Get client-site-aware database session for SQLite"""
        if not hasattr(request.state, 'db_session'):
            raise HTTPException(status_code=500, detail="Client site database session not available")
        return request.state.db_session
else:
    async def get_client_site_db(request: Request) -> AsyncSession:
        """Get client-site-aware database session for PostgreSQL"""
        if not hasattr(request.state, 'db'):
            raise HTTPException(status_code=500, detail="Client site database session not available")
        return request.state.db

# Dependency to get current client site
async def get_current_client_site(request: Request) -> str:
    """Get current client site subdomain"""
    if not hasattr(request.state, 'client_site'):
        raise HTTPException(status_code=400, detail="No client site context available")
    return request.state.client_site

# Additional validation methods for ClientSiteMiddleware class
ClientSiteMiddleware.validate_request_security = lambda self, request: validate_request_security(self, request)
ClientSiteMiddleware.validate_subdomain_format = lambda self, subdomain: validate_subdomain_format(self, subdomain)
ClientSiteMiddleware.validate_header_consistency = lambda self, request, client_site_header: validate_header_consistency(self, request, client_site_header)
ClientSiteMiddleware.validate_client_site_with_parent = lambda self, subdomain, client_site_uuid=None: validate_client_site_with_parent(self, subdomain, client_site_uuid)

def validate_subdomain_format(self, subdomain: str) -> bool:
    """Validate subdomain format to prevent injection attacks"""
    if not subdomain:
        return False
    
    # Basic format validation - alphanumeric and hyphens only
    if not re.match(r'^[a-zA-Z0-9-]+$', subdomain):
        return False
    
    # Length validation
    if len(subdomain) < 1 or len(subdomain) > 63:
        return False
    
    # Cannot start or end with hyphen
    if subdomain.startswith('-') or subdomain.endswith('-'):
        return False
    
    return True

async def validate_client_site_with_parent(self, subdomain: str, client_site_uuid: str = None) -> dict:
    """Validate client site with parent service"""
    try:
        # Skip validation if bypass is enabled
        if self.bypass_validation:
            logger.warning(f"Bypassing client site validation for '{subdomain}' - development mode")
            return {
                "id": "dev-client-site",
                "subdomain": subdomain,
                "name": f"{subdomain.title()} Client Site",
                "is_active": True,
                "status": "active"
            }
        
        # Build validation URL
        validation_url = f"{self.parent_service_url}/client-sites/{subdomain}/validate"
        
        # Prepare headers
        headers = {
            "X-Internal-Service": "child-backend",
            "Content-Type": "application/json"
        }
        
        # Add client site UUID if provided
        if client_site_uuid:
            headers["X-Client-Site-UUID"] = client_site_uuid
        
        # Make validation request to parent service
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(validation_url, headers=headers)
            
            if response.status_code == 200:
                client_site_info = response.json()
                logger.info(f"Successfully validated client site '{subdomain}' with parent service")
                return client_site_info
            elif response.status_code == 404:
                logger.warning(f"Client site '{subdomain}' not found in parent service")
                return None
            else:
                logger.error(f"Unexpected response from parent service: {response.status_code} - {response.text}")
                return None
                
    except httpx.TimeoutException:
        logger.error(f"Timeout while validating client site '{subdomain}' with parent service")
        return None
    except Exception as e:
        logger.error(f"Failed to validate client site '{subdomain}' with parent service: {str(e)}")
        return None

def validate_header_consistency(self, request: Request, client_site_header: str) -> bool:
    """Validate that client site header matches subdomain from host"""
    if not client_site_header:
        return True  # No header to validate
    
    # Extract subdomain from host
    host = request.headers.get("host", "")
    subdomain_from_host = get_subdomain_from_host(host)
    
    # If no subdomain from host, check if it's localhost
    if not subdomain_from_host:
        return True  # localhost requests are allowed
    
    # Check if client site header matches subdomain
    return client_site_header == subdomain_from_host

def validate_request_security(self, request: Request) -> bool:
    """Validate request for security issues"""
    # Basic security checks
    
    # Check for suspicious headers (case-insensitive comparison)
    allowed_headers = {"x-client-site-id", "x-client-site-uuid", "x-internal-service"}
    
    for header_name, header_value in request.headers.items():
        header_lower = header_name.lower()
        if header_lower.startswith("x-client-site-") and header_lower not in allowed_headers:
            logger.warning(f"Unexpected client site header: {header_name} = {header_value}")
            return False
    
    # Check request size
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            size = int(content_length)
            if size > 10485760:  # 10MB limit
                logger.warning(f"Request size {size} exceeds maximum 10MB")
                return False
        except ValueError:
            logger.warning(f"Invalid content-length header: {content_length}")
            return False
    
    return True

# Standalone functions for backward compatibility
def get_subdomain_from_host(host: str) -> str:
    """Extract subdomain from host header"""
    if not host:
        return ""
    
    # Remove port if present
    if ":" in host:
        host = host.split(":")[0]
    
    # Extract subdomain (everything before the main domain)
    parts = host.split(".")
    if len(parts) > 2:
        return parts[0]
    elif len(parts) == 2:
        # Could be either a subdomain or the main domain
        # For now, assume it's a subdomain if it's not "localhost"
        if parts[0] != "localhost":
            return parts[0]
    
    return ""

async def get_tenant_from_host(request: Request, db) -> str:
    """Get tenant from host header, headers, or query parameters"""
    host = request.headers.get("host", "")
    subdomain = get_subdomain_from_host(host)
    
    logger.info(f"[get_tenant_from_host] Host: '{host}', extracted subdomain: '{subdomain}'")
    
    if not subdomain:
        # Check for X-Client-Site-ID header as fallback
        subdomain = request.headers.get("X-Client-Site-ID", "")
        logger.info(f"[get_tenant_from_host] Using X-Client-Site-ID header: '{subdomain}'")
    
    if not subdomain:
        # Check for subdomain in query parameters as final fallback
        subdomain = request.query_params.get("subdomain", "")
        logger.info(f"[get_tenant_from_host] Using query parameter: '{subdomain}'")
    
    if not subdomain:
        raise HTTPException(status_code=400, detail="No client site information found in request")
    
    logger.info(f"[get_tenant_from_host] Final subdomain: '{subdomain}'")
    return subdomain

async def validate_jwt_client_id(request: Request) -> dict:
    """Validate JWT, build auth context with user, client_id, and tenant"""
    auth_header = request.headers.get("Authorization", "")
    logger.info(f"[validate_jwt_client_id] Auth header: {auth_header[:50]}...")
    
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = auth_header.split(" ", 1)[1].strip()

    try:
        claims = jwt.decode(token, settings.SECRET_KEY)
        claims.validate()
        logger.info(f"[validate_jwt_client_id] JWT claims: {dict(claims)}")
    except JoseError as e:
        logger.error(f"[validate_jwt_client_id] JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

    user_email = claims.get("sub")
    client_id = claims.get("client_id")
    
    logger.info(f"[validate_jwt_client_id] Extracted user_email: {user_email}, client_id: {client_id}")

    host = request.headers.get("host", "")
    subdomain = get_subdomain_from_host(host) or request.headers.get("X-Client-Site-ID", "") or request.query_params.get("subdomain", "") or "localhost"

    tenant = {"subdomain": subdomain, "id": client_id}
    
    auth_context = {"user": user_email, "client_id": client_id, "tenant": tenant}
    logger.info(f"[validate_jwt_client_id] Returning auth context: {auth_context}")

    return auth_context

async def require_active_tenant(request: Request) -> str:
    """Require active tenant - placeholder for now"""
    # This would normally check if tenant is active
    # For now, just return the subdomain from host
    host = request.headers.get("host", "")
    subdomain = get_subdomain_from_host(host)
    
    if not subdomain:
        subdomain = request.headers.get("X-Client-Site-ID", "")
    
    if not subdomain:
        raise HTTPException(status_code=400, detail="No active client site found")
    
    return subdomain
