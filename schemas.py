# schemas.py
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from datetime import datetime

class CRUDPermissions(BaseModel):
    create: bool = False
    read: bool = True
    update: bool = False
    delete: bool = False


class UserPermissions(BaseModel):
    users: Optional[CRUDPermissions] = None
    properties: Optional[CRUDPermissions] = None
    inspection_group: Optional[CRUDPermissions] = None
    inventory_group: Optional[CRUDPermissions] = None
    documents_group: Optional[CRUDPermissions] = None
    mainenance_group: Optional[CRUDPermissions] = None
    financial_group: Optional[CRUDPermissions] = None
    tenants_group: Optional[CRUDPermissions] = None
    profile_management: Optional[CRUDPermissions] = None
    profilegroup: Optional[CRUDPermissions] = None
    gallery_photos: Optional[CRUDPermissions] = None
    
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    permissions: Optional[UserPermissions] = None  # ← New field


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    permissions: Optional[Dict[str, Any]] = None  # Return as JSON

    class Config:
        from_attributes = True


# ==================== Property Creation Schema ====================

class TitleField(BaseModel):
    raw: str
    rendered: str


class ContentField(BaseModel):
    rendered: str
    protected: bool


# ==================== ACF Group Schemas ====================

class FileUpload(BaseModel):
    url: str  # e.g., "https://your-storage.com/files/proof-id.jpg"
    filename: str  # e.g., "john-doe-id.jpg"
    uploaded_at: Optional[str] = None  # ISO format: "2025-04-20T10:30:00"
    file_type: Optional[str] = None  # e.g., "image/jpeg", "application/pdf"
    
# Inspection
class ACFInspectionGroup(BaseModel):
    interior_of_property: Optional[str] = None
    exterior_of_property: Optional[str] = None
    appliance: Optional[str] = None


# Inventory
class InventoryItem(BaseModel):
    item_name: str
    image: Optional[str] = None
    cost: Optional[float] = None
    receipt: Optional[FileUpload] = None
    purchase_date: Optional[str] = None


class InventoryGroup(BaseModel):
    items: List[InventoryItem] = []


# Documents
class DocumentsGroup(BaseModel):
    document_upload: Optional[FileUpload] = None
    type: Optional[str] = None


class SupportingEvidence(BaseModel):
    land_registry: Optional[FileUpload] = None
    last_sold: Optional[str] = None


class LandlordContract(BaseModel):
    land_contract: Optional[FileUpload] = None
    date: Optional[str] = None


class DocumentsGroupFull(BaseModel):
    documents: Optional[DocumentsGroup] = None
    supporting_evidence: Optional[SupportingEvidence] = None
    landlord_contract: Optional[LandlordContract] = None


# Maintenance
class MaintenanceGroup(BaseModel):
    where: Optional[str] = None
    what: Optional[str] = None
    cost: Optional[float] = None
    invoice: Optional[FileUpload] = None  # ✅ Now supports file metadata
    payable_by: Optional[str] = None
    contractor_supplied_by: Optional[str] = None


# Financial
class FinancialGroup(BaseModel):
    rent_to_landord: Optional[str] = None
    rent_yeild: Optional[float] = None
    collection_date: Optional[str] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None


# Tenants
class EmergencyContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class Guarantor(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class TenantsGroup(BaseModel):
    tenants_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    employment_status: Optional[str] = None
    agreement_signed_date: Optional[str] = None
    right_to_rent: Optional[FileUpload] = None
    proof_of_id: Optional[FileUpload] = None
    emergency_contact: Optional[EmergencyContact] = None
    guarantor: Optional[Guarantor] = None


# Property Details - Profile Management
class ProfileManagement(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    email: Optional[str] = None


# Property Details - Profile Group (Main Details)
class ProfileGroup(BaseModel):
    postcode: Optional[str] = None
    payment_frequency: Optional[str] = None
    house_number: Optional[Union[int, str]] = None
    location: Optional[str] = None
    beds: Optional[Union[int, str]] = None
    bathrooms: Optional[Union[int, str]] = None
    living_rooms: Optional[Union[int, str]] = None
    parking: Optional[Union[int, str]] = None
    furnished: Optional[str] = None
    property_type: Optional[str] = None
    marketing_status: Optional[str] = None
    incoming_price: Optional[Union[int, float]] = None
    incoming_payment_frequency: Optional[str] = None
    outgoing_price: Optional[Union[int, float]] = None
    outgoing_payment_frequency: Optional[str] = None
    incoming_type: Optional[str] = None
    outgoing_type: Optional[str] = None
    incoming_date: Optional[datetime] = None
    outgoing_date: Optional[datetime] = None
    property_status: Optional[str] = None
    categories: Optional[str] = None

# Gallery
# Use Union for flexible gallery_photos (can be list, bool, or dict)
GalleryPhotos = Union[List[str], bool, Dict[str, Any]]


# ==================== ACF Update Schema 

class ACFUpdate(BaseModel):
    inspection_group: Optional[ACFInspectionGroup] = None
    inventory_group: Optional[InventoryGroup] = None
    documents_group: Optional[DocumentsGroupFull] = None
    mainenance_group: Optional[MaintenanceGroup] = None
    financial_group: Optional[FinancialGroup] = None
    tenants_group: Optional[TenantsGroup] = None
    profile_management: Optional[ProfileManagement] = None
    profilegroup: Optional[ProfileGroup] = None  # ← Add this
    gallery_photos: Optional[GalleryPhotos] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    
# --- Event ---
class EventBase(BaseModel):
    property_id: int
    event_name: str
    event_details: Optional[str] = None
    lease_date: Optional[datetime] = None
    incoming: Optional[str] = None
    outgoing: Optional[str] = None
    tenant: Optional[str] = None
    incoming_color: Optional[str] = None
    outgoing_color: Optional[str] = None
    incoming_frequency: Optional[str] = None
    incoming_type: Optional[str] = None
    outgoing_type: Optional[str] = None
    incoming_amount: Optional[float] = None
    outgoing_amount: Optional[float] = None
    status: Optional[str] = None
    incoming_status: Optional[str] = None
    outgoing_status: Optional[str] = None
    checkout: bool = False
    property_type: Optional[str] = None
    payment_date: Optional[datetime] = None


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Payment ---
class PaymentBase(BaseModel):
    property_id: int
    amount: float
    category: Optional[str] = None
    property_type: Optional[str] = None
    payment_type: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    tenant: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# --- Inventory / Rooms / Items ---------
class ItemBase(BaseModel):
    name: str
    brand: Optional[str] = None
    purchase_date: Optional[datetime] = None
    value: Optional[float] = None
    condition: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None
    photos: Optional[List[str]] = None


class ItemCreate(ItemBase):
    pass


class ItemResponse(ItemBase):
    id: int
    created: Optional[datetime] = None
    updated: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==================== room
class RoomBase(BaseModel):
    room_name: str


class RoomCreate(RoomBase):
    items: List[ItemCreate] = []


class RoomResponse(RoomBase):
    id: int
    items: List[ItemResponse] = []

    class Config:
        from_attributes = True

# ==================== Inventory
class InventoryBase(BaseModel):
    property_id: int
    property_name: str


class InventoryCreate(InventoryBase):
    rooms: List[RoomCreate] = []


class InventoryResponse(InventoryBase):
    id: int
    rooms: List[RoomResponse] = []

    class Config:
        from_attributes = True


# ==================== Property 
class PropertyCreate(BaseModel):
    title: str
    address: str
    description: str
    acf: Optional[ACFUpdate] = None

    class Config:
        from_attributes = True
        
        
class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None
    acf: Optional[ACFUpdate] = None


class PropertyResponse(BaseModel):
    id: int
    title: str
    address: str
    description: Optional[str] = None
    owner_id: int
    tenant_info: Optional[Dict[Any, Any]] = None
    financial_info: Optional[Dict[Any, Any]] = None
    maintenance_records: Optional[List[Dict[Any, Any]]] = None
    documents: Optional[List[Dict[Any, Any]]] = None
    inventory: Optional[InventoryResponse] = None
    inspections: Optional[Dict[Any, Any]] = None
    acf: Optional[Dict[Any, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        
        
class PropertyInspectionUpdate(BaseModel):
    inspector: str
    notes: Optional[str] = None
    score: Optional[int] = None
    issues_found: List[str] = []
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        
# ==================== payment
class PaymentBase(BaseModel):
    property_id: int
    amount: float
    category: Optional[str] = None
    payment_type: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    tenant: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
        
        
# --- DefaultRoom Schemas ---
class DefaultRoomBase(BaseModel):
    room_name: str
    order: int = 0


class DefaultRoomCreate(DefaultRoomBase):
    pass


class DefaultRoomResponse(DefaultRoomBase):
    id: int

    class Config:
        from_attributes = True  # Replaces `orm_mode = True` in Pydantic v2


# --- DefaultItem Schemas ---
class DefaultItemBase(BaseModel):
    room_name: str
    name: str
    brand: Optional[str] = None
    value: Optional[float] = None
    condition: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None
    photos: Optional[List[str]] = None  # List of image URLs
    order: int = 0


class DefaultItemCreate(DefaultItemBase):
    pass


class DefaultItemResponse(DefaultItemBase):
    id: int

    class Config:
        from_attributes = True