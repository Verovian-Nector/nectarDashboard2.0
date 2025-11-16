from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from typing import Optional
from database import get_db
from sqlalchemy.orm import Session
import crud

security = HTTPBearer()

def get_subdomain_from_host(host: str) -> str:
    """Extract subdomain from Host header"""
    if not host:
        return 'localhost'
    
    # Remove port if present
    host = host.split(':')[0]
    
    # Handle different cases:
    # tenant1.localhost:8002 -> tenant1
    # test.localhost:8002 -> test
    # localhost:8002 -> localhost
    
    parts = host.split('.')
    if len(parts) >= 2 and parts[1] == 'localhost':
        return parts[0]
    
    return 'localhost'

def get_tenant_from_host(request: Request, db: Session = Depends(get_db)) -> dict:
    """Extract tenant context from Host header"""
    host = request.headers.get('host')
    subdomain = get_subdomain_from_host(host)
    
    # Get tenant from database using subdomain
    tenant = crud.get_tenant_by_subdomain(db, subdomain)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {
        "id": tenant.id,
        "subdomain": tenant.subdomain,
        "name": tenant.name,
        "is_active": tenant.is_active
    }

def validate_jwt_client_id(credentials: HTTPAuthorizationCredentials = Depends(security), 
                           tenant: dict = Depends(get_tenant_from_host)) -> dict:
    """Validate JWT token and ensure client_id matches tenant context"""
    try:
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials,
            os.getenv("JWT_SECRET_KEY", "your-secret-key"),
            algorithms=["HS256"]
        )
        
        # Extract client_id from JWT payload
        jwt_client_id = payload.get("client_id")
        if not jwt_client_id:
            raise HTTPException(status_code=401, detail="Missing client_id in token")
        
        # Validate client_id matches tenant context
        if jwt_client_id != tenant["id"]:
            raise HTTPException(status_code=403, detail="Client ID mismatch with tenant context")
        
        # Return combined context
        return {
            "user": payload.get("sub"),
            "client_id": jwt_client_id,
            "tenant": tenant
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_active_tenant(tenant: dict = Depends(get_tenant_from_host)) -> dict:
    """Ensure tenant is active before allowing access"""
    if not tenant.get("is_active"):
        raise HTTPException(status_code=403, detail="Tenant account is inactive")
    return tenant