# main.py
from schemas import (
    UserCreate,
    UserResponse,
    UserPermissions,
    PropertyCreate,
    PropertyResponse,
    PropertyUpdate,
    PropertyInspectionUpdate,
    Token,
    EventCreate,
    EventResponse,
    PaymentCreate,
    PaymentResponse,
    InventoryCreate,
    InventoryResponse,
    ItemCreate,
    ItemResponse,
    RoomCreate,
    RoomResponse,
    DefaultRoomResponse,
    DefaultRoomCreate,
    DefaultItemResponse,
    DefaultItemCreate,
)
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from database import engine, get_db, Base, DBUser, DBProperty
from crud import (
    get_user,
    create_user,
    get_properties,
    get_property,
    create_property,
    update_property,
    create_event,
    get_events,
    create_payment,
    get_payments,
    create_inventory_with_rooms,
    get_inventory,
    update_inventory_with_rooms,
)

from auth import authenticate_user, create_access_token, get_current_user
from dependencies import require_permission  # ✅ Add this
from security import get_password_hash

app = FastAPI()

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Property Management API",
        "endpoints": {
            "auth": "/token",
            "users": "/users",
            "properties": "/properties"
        }
    }
    
    
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ==================== AUTH ENDPOINTS ====================

@app.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/users", response_model=UserResponse)
async def create_user_endpoint(
    user: UserCreate,
    current_user: DBUser = Depends(require_permission("users", "create")),
    db: AsyncSession = Depends(get_db)
):
    existing_user = await get_user(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.put("/users/{user_id}/permissions", response_model=UserResponse)
async def update_user_permissions(
    user_id: int,
    permissions: UserPermissions,
    current_user: DBUser = Depends(require_permission("users", "update")),
    db: AsyncSession = Depends(get_db)
):
    db_user = await db.get(DBUser, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db_user.permissions = permissions.model_dump()
    await db.commit()
    await db.refresh(db_user)
    return db_user
    
@app.get("/users/me", response_model=UserResponse)
async def read_current_user(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return current_user

# ==================== PROPERTY ENDPOINTS ====================

@app.get("/properties", response_model=List[PropertyResponse])
async def read_properties(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    return await get_properties(db, skip=skip, limit=limit)
    
    
@app.get("/properties/{property_id}", response_model=PropertyResponse)
async def read_property(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    property = await get_property(db, property_id)
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return property


@app.post("/properties", response_model=PropertyResponse)
async def create_new_property(
    property: PropertyCreate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_property = await create_property(db, property, current_user.id)
    return db_property

    # Convert to dict to avoid ORM serialization issues
    return {
        "id": db_property.id,
        "title": db_property.title,
        "address": db_property.address,
        "owner_id": db_property.owner_id,
        "tenant_info": db_property.tenant_info,
        "financial_info": db_property.financial_info,
        "maintenance_records": db_property.maintenance_records,
        "documents": db_property.documents,
        "inspections": db_property.inspections,
        "created_at": db_property.created_at,
        "updated_at": db_property.updated_at,
        "inventory": [
            {
                "id": inv.id,
                "property_id": inv.property_id,
                "property_name": inv.property_name,
                "rooms": [
                    {
                        "id": room.id,
                        "name": room.name,
                        "room_type": room.room_type,
                        "items": [
                            {
                                "id": item.id,
                                "name": item.name,
                                "item_type": item.item_type,
                                "quantity": item.quantity,
                                "notes": item.notes,
                                "room_id": item.room_id
                            }
                            for item in room.items
                        ]
                    }
                    for room in inv.rooms
                ]
            }
            for inv in db_property.inventory
        ] if db_property.inventory else []
    }


# ==================== USER MANAGEMENT ====================

@app.get("/users", response_model=List[UserResponse])
async def read_users(
    roles: str = "propertyManager,propertyowner,propertyadmin",
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    # Only allow propertyadmin to view users
    if current_user.role != "propertyadmin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    role_list = [role.strip() for role in roles.split(",") if role.strip()]
    result = await db.execute(
        select(DBUser).where(DBUser.role.in_(role_list)).where(DBUser.is_active == True)
    )
    users = result.scalars().all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found with given roles")
    return users


# ==================== PROPERTY UPDATE ENDPOINTS ====================

@app.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_existing_property(
    property_id: int,
    property_update: PropertyUpdate,
    current_user: DBUser = Depends(require_permission("properties", "update")),
    db: AsyncSession = Depends(get_db)
):
    db_property = await db.get(DBProperty, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    updates = property_update.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(db_property, key, value)
    db_property.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(db_property)
    return db_property


# ==================== EVENTS ENDPOINTS ====================
    
@app.post("/events", response_model=EventResponse)
async def create_event_endpoint(
    event: EventCreate,
    current_user: DBUser = Depends(require_permission("events", "create")),
    db: AsyncSession = Depends(get_db)
):
    return await create_event(db, event)


@app.get("/events", response_model=List[EventResponse])
async def read_events(
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(require_permission("events", "read")),
    db: AsyncSession = Depends(get_db)
):
    return await get_events(db, skip=skip, limit=limit)
    
# ==================== PAYMENTS ENDPOINTS ====================
    
@app.post("/payments", response_model=PaymentResponse)
async def create_payment_endpoint(
    payment: PaymentCreate,
    current_user: DBUser = Depends(require_permission("payments", "create")),
    db: AsyncSession = Depends(get_db)
):
    return await create_payment(db, payment)

@app.get("/payments", response_model=List[PaymentResponse])
async def read_payments(
    skip: int = 0,
    limit: int = 100,
    current_user: DBUser = Depends(require_permission("payments", "read")),
    db: AsyncSession = Depends(get_db)
):
    return await get_payments(db, skip, limit)
    
# ==================== INVENTORY ENDPOINTS ====================
    
@app.post("/inventory", response_model=InventoryResponse)
async def create_inventory_endpoint(
    inventory: InventoryCreate,
    current_user: DBUser = Depends(require_permission("inventory", "create")),
    db: AsyncSession = Depends(get_db)
):
    result = await create_inventory_with_rooms(db, inventory.model_dump())
    return result
    
    
@app.put("/inventory/{inventory_id}", response_model=InventoryResponse)
async def update_inventory_endpoint(
    inventory_id: int,
    inventory: InventoryCreate,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    result = await update_inventory_with_rooms(db, inventory_id, inventory.model_dump())
    return result
    
# ==================== DEFAULT ENDPOINTS ====================
    
@app.get("/defaults/rooms", response_model=List[DefaultRoomResponse])
async def get_default_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "read"))
):
    result = await db.execute(select(DefaultRoom).order_by(DefaultRoom.order))
    return result.scalars().all()


@app.post("/defaults/rooms", response_model=DefaultRoomResponse)
async def create_default_room(
    room: DefaultRoomCreate,
    current_user: DBUser = Depends(require_permission("inventory", "create")),
    db: AsyncSession = Depends(get_db)
):
    db_room = DefaultRoom(**room.model_dump())
    db.add(db_room)
    await db.commit()
    await db.refresh(db_room)
    return db_room


@app.delete("/defaults/rooms/{room_id}")
async def delete_default_room(
    room_id: int,
    current_user: DBUser = Depends(require_permission("inventory", "delete")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DefaultRoom).where(DefaultRoom.id == room_id))
    room = result.scalar()
    if not room:
        raise HTTPException(status_code=404, detail="Default room not found")
    
    await db.execute(delete(DefaultRoom).where(DefaultRoom.id == room_id))
    await db.commit()
    return {"message": "Default room deleted"}


@app.get("/defaults/items", response_model=List[DefaultItemResponse])
async def get_default_items(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "read"))
):
    result = await db.execute(select(DefaultItem).order_by(DefaultItem.order))
    return result.scalars().all()


@app.post("/defaults/items", response_model=DefaultItemResponse)
async def create_default_item(
    item: DefaultItemCreate,
    current_user: DBUser = Depends(require_permission("inventory", "create")),
    db: AsyncSession = Depends(get_db)
):
    db_item = DefaultItem(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@app.delete("/defaults/items/{item_id}")
async def delete_default_item(
    item_id: int,
    current_user: DBUser = Depends(require_permission("inventory", "delete")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DefaultItem).where(DefaultItem.id == item_id))
    item = result.scalar()
    if not item:
        raise HTTPException(status_code=404, detail="Default item not found")
    
    await db.execute(delete(DefaultItem).where(DefaultItem.id == item_id))
    await db.commit()
    return {"message": "Default item deleted"}


