# schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PropertyCreate(BaseModel):
    title: str
    address: str
    owner_id: int

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    owner_id: Optional[int] = None

class PropertyInspectionUpdate(BaseModel):
    inspector: str
    notes: Optional[str] = None
    score: Optional[int] = None
    issues_found: List[str] = []

class PropertyResponse(BaseModel):
    id: int
    title: str
    address: str
    owner_id: int
    tenant_info: Optional[Dict[Any, Any]] = None
    financial_info: Optional[Dict[Any, Any]] = None
    maintenance_records: Optional[List[Dict[Any, Any]]] = None
    documents: Optional[List[Dict[Any, Any]]] = None
    inventory: Optional[Dict[Any, Any]] = None
    inspections: Optional[Dict[Any, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str