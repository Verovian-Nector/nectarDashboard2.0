from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from middleware import validate_jwt_client_id
import datetime

router = APIRouter(prefix="/integrations", tags=["integrations"])

class IntegrationConfig(BaseModel):
    id: int
    client_id: int
    integration_type: str
    direction: str  # 'inbound' | 'outbound' | 'bidirectional'
    source_of_truth: Optional[str] = None  # 'dashboard' | 'external'
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None  # 'none' | 'basic' | 'bearer' | 'apikey' | 'hmac'
    auth_config: Optional[Dict[str, Any]] = None
    field_mappings: Optional[Dict[str, Any]] = None
    transforms: Optional[Dict[str, Any]] = None
    enabled: bool = True
    created_at: str
    updated_at: str

class CreateIntegrationPayload(BaseModel):
    integration_type: str
    direction: str
    source_of_truth: Optional[str] = None
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    field_mappings: Optional[Dict[str, Any]] = None
    transforms: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = True

class UpdateIntegrationPayload(BaseModel):
    integration_type: Optional[str] = None
    direction: Optional[str] = None
    source_of_truth: Optional[str] = None
    endpoint_url: Optional[str] = None
    auth_type: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None
    field_mappings: Optional[Dict[str, Any]] = None
    transforms: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

# Mock data storage (replace with database in production)
integrations_db = []
integration_id_counter = 1

@router.get("/", response_model=List[IntegrationConfig])
async def list_integrations(
    auth_context: dict = Depends(validate_jwt_client_id)
):
    """List integrations scoped to authenticated tenant"""
    client_id = auth_context["client_id"]
    
    # Filter integrations by client_id from JWT context
    tenant_integrations = [
        integration for integration in integrations_db 
        if integration["client_id"] == client_id
    ]
    
    return tenant_integrations

@router.post("/", response_model=IntegrationConfig)
async def create_integration(
    payload: CreateIntegrationPayload,
    auth_context: dict = Depends(validate_jwt_client_id)
):
    """Create integration with client_id derived from JWT context"""
    global integration_id_counter
    
    client_id = auth_context["client_id"]
    now = datetime.datetime.utcnow().isoformat()
    
    # Create new integration with client_id from JWT context
    new_integration = {
        "id": integration_id_counter,
        "client_id": client_id,  # Derived from JWT, not from payload
        "integration_type": payload.integration_type,
        "direction": payload.direction,
        "source_of_truth": payload.source_of_truth,
        "endpoint_url": payload.endpoint_url,
        "auth_type": payload.auth_type,
        "auth_config": payload.auth_config,
        "field_mappings": payload.field_mappings,
        "transforms": payload.transforms,
        "enabled": payload.enabled if payload.enabled is not None else True,
        "created_at": now,
        "updated_at": now
    }
    
    integrations_db.append(new_integration)
    integration_id_counter += 1
    
    return new_integration

@router.put("/{integration_id}", response_model=IntegrationConfig)
async def update_integration(
    integration_id: int,
    payload: UpdateIntegrationPayload,
    auth_context: dict = Depends(validate_jwt_client_id)
):
    """Update integration scoped to authenticated tenant"""
    client_id = auth_context["client_id"]
    
    # Find integration by ID and client_id
    integration = next(
        (item for item in integrations_db 
         if item["id"] == integration_id and item["client_id"] == client_id),
        None
    )
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found or access denied"
        )
    
    # Update fields
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        integration[field] = value
    
    integration["updated_at"] = datetime.datetime.utcnow().isoformat()
    
    return integration

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    auth_context: dict = Depends(validate_jwt_client_id)
):
    """Delete integration scoped to authenticated tenant"""
    client_id = auth_context["client_id"]
    
    # Find integration by ID and client_id
    integration_index = next(
        (index for index, item in enumerate(integrations_db) 
         if item["id"] == integration_id and item["client_id"] == client_id),
        None
    )
    
    if integration_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found or access denied"
        )
    
    # Remove integration
    integrations_db.pop(integration_index)
    
    return {"message": "Integration deleted successfully"}