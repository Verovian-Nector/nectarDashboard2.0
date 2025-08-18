# main.py
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
from datetime import datetime

from schemas import (
    UserCreate,
    UserResponse,
    UserPermissions,
    PropertyCreate,
    PropertyResponse,
    PropertyUpdate,
    Token,  # ✅ Add this
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

from database import engine, get_db, Base, DBUser, DBProperty
from crud import (
    get_user,
    create_user,
    get_properties,
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
    current_user: DBUser = Depends(require_permission("properties", "read")),
    db: AsyncSession = Depends(get_db)
):
    return await get_properties(db, skip=skip, limit=limit)


@app.post("/properties", response_model=PropertyResponse)
async def create_new_property(
    property: PropertyCreate,
    current_user: DBUser = Depends(require_permission("properties", "create")),
    db: AsyncSession = Depends(get_db)
):
    return await create_property(db, property)


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
    db_property.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(db_property)
    return db_property
    
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
    
    
@app.post("/defaults/rooms", response_model=DefaultRoomResponse)
async def create_default_room(
    room: DefaultRoomCreate,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    db_room = DefaultRoom(**room.model_dump())
    db.add(db_room)
    await db.commit()
    await db.refresh(db_room)
    return db_room


@app.post("/defaults/items", response_model=DefaultItemResponse)
async def create_default_item(
    item: DefaultItemCreate,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    db_item = DefaultItem(**item.model_dump())
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item