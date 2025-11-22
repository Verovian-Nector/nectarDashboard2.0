import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ClientSite
import httpx
import os

logger = logging.getLogger(__name__)

class ClientSiteMiddleware:
    """Middleware for validating client site context and preventing cross-client-site access"""
    
    def __init__(self):
        self.parent_service_url = os.getenv("PARENT_SERVICE_URL", "http://parent:8001")
        self.bypass_validation = os.getenv("BYPASS_CLIENT_SITE_VALIDATION", "false").lower() == "true"
    
    async def validate_client_site(self, request: Request) -> Optional[Dict[str, Any]]:
        """Validate client site context from request headers
        Returns client site information if valid, None if no client site context, raises exception if invalid
        """
        if self.bypass_validation:
            logger.warning("Client site validation bypassed - this should only be used in development")
            return None
        
        # Bypass validation for authentication endpoints
        if request.url.path in ["/token", "/users/me"]:
            return None
        
        # Extract client site information from headers
        client_site_subdomain = request.headers.get("X-Client-Site-ID")
        client_site_id = request.headers.get("X-Client-Site-UUID")
        
        if not client_site_subdomain:
            # No client site context - this might be a parent service request
            return None
        
        # Validate client site exists and is active
        try:
            # Use parent service to validate tenant
            async with httpx.AsyncClient(timeout=5.0) as client:
                if client_site_id:
                    # Validate by UUID
                    response = await client.get(
                        f"{self.parent_service_url}/client-sites/{client_site_id}",
                        headers={"X-Internal-Service": "child-service"}
                    )
                else:
                    # Validate by subdomain
                    response = await client.get(
                        f"{self.parent_service_url}/client-sites/{client_site_subdomain}/status",
                        headers={"X-Internal-Service": "child-service"}
                    )
                
                if response.status_code == 200:
                    client_site_data = response.json()
                    
                    # Check if client site is active
                    if not client_site_data.get("is_active"):
                        raise HTTPException(
                            status_code=403,
                            detail=f"Client site '{client_site_subdomain}' is not active"
                        )
                    
                    if client_site_data.get("status") != "active":
                        raise HTTPException(
                            status_code=403,
                            detail=f"Client site '{client_site_subdomain}' status is '{client_site_data.get('status')}'"
                        )
                    
                    # Add client site context to request state
                    request.state.client_site = client_site_data
                    return tenant_data
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Client site '{client_site_subdomain}' not found"
                    )
                    
        except httpx.TimeoutException:
            logger.error(f"Timeout validating client site '{client_site_subdomain}' with parent service")
            raise HTTPException(
                status_code=503,
                detail="Unable to validate client site - parent service unavailable"
            )
        except httpx.ConnectError:
            logger.error(f"Connection error validating client site '{client_site_subdomain}' with parent service")
            raise HTTPException(
                status_code=503,
                detail="Unable to validate client site - parent service connection failed"
            )
        except Exception as e:
            logger.error(f"Error validating client site '{client_site_subdomain}': {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error validating client site: {str(e)}"
            )
    
    def validate_data_access(self, request: Request, client_site_id: str) -> bool:
        """Validate that the requested data belongs to the current client site
        Prevents cross-client-site data access
        """
        if self.bypass_validation:
            return True
        
        client_site_context = getattr(request.state, 'client_site', None)
        if not client_site_context:
            logger.warning("No client site context available for data access validation")
            return False
        
        # Check if the requested client_site_id matches the current client site context
        current_client_site_id = client_site_context.get('id')
        if current_client_site_id and current_client_site_id != client_site_id:
            logger.warning(f"Cross-client-site access attempt: current client site '{current_client_site_id}' accessing data for '{client_site_id}'")
            return False
        
        return True
    
    def detect_header_tampering(self, request: Request) -> bool:
        """
        Detect potential header tampering attempts
        Returns True if tampering detected, False otherwise
        """
        if self.bypass_validation:
            return False
        
        # Check for conflicting client site information
        subdomain_header = request.headers.get("X-Client-Site-ID")
        uuid_header = request.headers.get("X-Client-Site-UUID")
        
        if subdomain_header and uuid_header:
            # Both headers present - validate consistency
            try:
                # This would require additional validation logic
                # For now, log the potential issue
                logger.info(f"Both X-Client-Site-ID and X-Client-Site-UUID headers present: {subdomain_header} / {uuid_header}")
                return False  # Allow for now, but log for monitoring
            except Exception as e:
                logger.warning(f"Potential header tampering detected: {str(e)}")
                return True
        
        # Check for suspicious patterns in headers
        for header_name, header_value in request.headers.items():
            if header_name.startswith("X-Client-Site-") and not header_name in ["X-Client-Site-ID", "X-Client-Site-UUID"]:
                logger.warning(f"Unexpected client site header: {header_name} = {header_value}")
                return True
        
        return False

# Global middleware instance
client_site_middleware = ClientSiteMiddleware()

async def validate_client_site_middleware(request: Request, call_next):
    """
    FastAPI middleware for client site validation
    This should be added to the FastAPI app middleware stack
    """
    try:
        # Validate client site context
        await client_site_middleware.validate_client_site(request)
        
        # Check for header tampering
        if client_site_middleware.detect_header_tampering(request):
            logger.warning("Header tampering detected, rejecting request")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid request headers detected"}
            )
        
        # Continue with request processing
        response = await call_next(request)
        return response
        
    except HTTPException as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail}
        )
    except Exception as e:
        logger.error(f"Unexpected error in client site middleware: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )