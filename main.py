import os
import re
import base64
import uuid
from fastapi import FastAPI, Depends, HTTPException, status, Query, Form, UploadFile, File, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, String, and_, Integer, func,select
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
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
    RoomBase,
    RoomResponse,
    DefaultRoomResponse,
    DefaultRoomCreate,
    DefaultItemResponse,
    DefaultItemCreate,
)
from database import engine, get_db, Base, DBUser, DBProperty, DefaultItem, DefaultRoom, Inventory, Room, Item
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
    sort_by: Optional[str] = None,
    order: Optional[str] = "asc",
    location: Optional[str] = None,
    beds: Optional[int] = None,
    bathrooms: Optional[int] = None,
    property_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("properties", "read"))
):

    # Normalize order
    order = order.lower()
    if order not in ("asc", "desc"):
        order = "asc"
        
        
    query = select(DBProperty)

    # 🔍 Filters
    if location:
        print(f"🔍 Filtering by location: '{location}'")
        loc_col = DBProperty.acf['profilegroup']['location'].astext
        query = query.where(
            and_(
                loc_col.is_not(None),
                func.trim(func.lower(loc_col)) == func.trim(func.lower(location))
            )
        )
        print("✅ Location filter applied")

    if beds is not None:
        beds_path = DBProperty.acf['profilegroup']['beds']
        beds_val = cast(beds_path, Integer)
        query = query.where(
            and_(
                beds_path.is_not(None),
                beds_val >= beds
            )
        )

    # 📊 Sort (example)
    if sort_by:
        sort_col = None
        if sort_by == "created":
            sort_col = DBProperty.created_at
        elif sort_by == "title":
            sort_col = DBProperty.title
        elif sort_by == "location":
            loc_path = DBProperty.acf['profilegroup']['location'].astext
            sort_col = func.lower(func.trim(loc_path))
        elif sort_by == "beds":
            beds_path = DBProperty.acf['profilegroup']['beds'].astext
            sort_col = cast(beds_path, Integer)

        # ✅ Only check if sort_col was set, not its SQL value
        if sort_col is not None:
            if order == "desc":
                sort_col = sort_col.desc()
            query = query.order_by(sort_col)

    # ✅ Eager load nested data
    query = query.options(
        selectinload(DBProperty.inventory)
        .selectinload(Inventory.rooms)
        .selectinload(Room.items)
    )

    # 📄 Pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    properties = result.scalars().all()
    return properties
    
    
    
@app.get("/properties/{property_id}", response_model=PropertyResponse)
async def read_property(
    property_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("properties", "read"))
):
    result = await db.execute(
    select(DBProperty)
    .options(
        selectinload(DBProperty.inventory)
        .selectinload(Inventory.rooms)
        .selectinload(Room.items)
        )
        .where(DBProperty.id == property_id)
    )
    property_obj = result.scalar()  # ✅ Ensures single object
    
    return PropertyResponse.model_validate(property_obj)

    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")


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
        "description": db_property.description,
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

    
    

@app.post("/inventory/{inventory_id}/rooms", response_model=RoomResponse)
async def add_room_to_inventory(
    inventory_id: int,
    room_data: RoomCreate,
    current_user: DBUser = Depends(require_permission("inventory", "create")),
    db: AsyncSession = Depends(get_db)
):
    # Verify inventory exists
    result = await db.execute(
        select(Inventory).where(Inventory.id == inventory_id)
    )
    inventory = result.scalar()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    # Create room
    room = Room(inventory_id=inventory_id, room_name=room_data.room_name)
    db.add(room)
    await db.commit()
    await db.refresh(room)

    # Add items if provided
    for item_data in room_data.items:
        item = Item(room_id=room.id, **item_data.model_dump())
        db.add(item)
    await db.commit()

    # Re-fetch room with items eagerly loaded
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.items))  # ✅ Load items now
        .where(Room.id == room.id)
    )
    room_with_items = result.scalar()

    return room_with_items
    
    
@app.put("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_update: RoomBase,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    # Find and update the room
    result = await db.execute(select(Room).where(Room.id == room_id))
    db_room = result.scalar()
    if not db_room:
        raise HTTPException(status_code=404, detail="Room not found")

    db_room.room_name = room_update.room_name
    await db.commit()
    await db.refresh(db_room)

    # ❌ Don't return db_room directly — items will fail to load!

    # ✅ Re-fetch room with items eagerly loaded
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.items))
        .where(Room.id == room_id)
    )
    room_with_items = result.scalar()

    return room_with_items
    
    
@app.delete("/rooms/{room_id}")
async def delete_room(
    room_id: int,
    current_user: DBUser = Depends(require_permission("inventory", "delete")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    await db.delete(room)
    await db.commit()
    return {"status": "deleted"}
    
    
@app.get("/rooms/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "read"))
):
    result = await db.execute(
        select(Room)
        .options(selectinload(Room.items))
        .where(Room.id == room_id)
    )
    room = result.scalar()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room
    
    
@app.post("/rooms/{room_id}/items", response_model=ItemResponse)
async def add_item_to_room(
    room_id: int,
    item_data: ItemCreate,
    current_user: DBUser = Depends(require_permission("inventory", "create")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    item = Item(room_id=room_id, **item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item
    
    
@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_update: ItemCreate,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in item_update.model_dump().items():
        setattr(item, key, value)
    item.updated = datetime.utcnow()

    await db.commit()
    await db.refresh(item)
    return item
    
    
@app.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    current_user: DBUser = Depends(require_permission("inventory", "delete")),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.delete(item)
    await db.commit()
    return {"status": "deleted"}
    
    

    
# ==================== DEFAULT ENDPOINTS ====================
    
@app.get("/defaults/rooms", response_model=List[DefaultRoomResponse])
async def get_default_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "read"))
):
    result = await db.execute(select(DefaultRoom).order_by(DefaultRoom.order))  # ✅ Fixed
    default_rooms = result.scalars().all()
    return default_rooms


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
    
    
@app.put("/defaults/rooms/{room_id}", response_model=DefaultRoomResponse)
async def update_default_room(
    room_id: int,
    room: DefaultRoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "update"))
):
    result = await db.execute(select(DefaultRoom).where(DefaultRoom.id == room_id))
    db_room = result.scalar()
    if not db_room:
        raise HTTPException(status_code=404, detail="Default room not found")
    
    for key, value in room.model_dump().items():
        setattr(db_room, key, value)
    
    await db.commit()
    await db.refresh(db_room)
    return db_room


@app.get("/defaults/items", response_model=List[DefaultItemResponse])
async def get_default_items(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(require_permission("inventory", "read"))
):
    result = await db.execute(select(DefaultItem).order_by(order))
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

@app.put("/items/{item_id}", response_model=ItemResponse)
async def update_item_endpoint(
    item_id: int,
    item_update: ItemCreate,
    current_user: DBUser = Depends(require_permission("inventory", "update")),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing inventory item.
    Requires 'inventory' -> 'update' permission.
    """
    # Fetch the item
    result = await db.execute(select(Item).where(Item.id == item_id))
    db_item = result.scalar()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Update fields
    for key, value in item_update.model_dump().items():
        setattr(db_item, key, value)

    # Update timestamp
    db_item.updated = datetime.utcnow()

    await db.commit()
    await db.refresh(db_item)

    return db_item


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(None),
    file_data_urls: Optional[List[str]] = Form(None)
):
    base_url = "https://dashboard.nectarestates.com"
    uploaded_urls = []

    # 🔍 Debug: Print what was received
    print(f"Received files: {[f.filename for f in files if f]}")
    print(f"Received data URLs: {file_data_urls}")

    # Handle real file uploads
    if files:
        for file in files:
            if file.filename is None or file.size == 0:
                continue

            ext = Path(file.filename).suffix or ".bin"
            safe_name = f"{uuid.uuid4().hex}{ext}"
            file_path = UPLOAD_DIR / safe_name

            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)

            uploaded_urls.append(f"{base_url}/uploads/{safe_name}")

    # Handle data URLs
    if file_data_urls:
        for data_url in file_data_urls:
            if not data_url or not data_url.startswith(""):
                print(f"Skipping invalid data URL: {data_url}")
                continue

            match = re.match(r"(?P<type>[^;]+);base64,(?P<data>.+)", data_url)
            if not match:
                print(f"Invalid data URL format: {data_url}")
                continue

            mime_type = match.group("type")
            base64_str = match.group("data")

            ext = ".bin"
            if "image/jpeg" in mime_type:
                ext = ".jpg"
            elif "image/png" in mime_type:
                ext = ".png"
            elif "application/pdf" in mime_type:
                ext = ".pdf"

            safe_name = f"{uuid.uuid4().hex}{ext}"
            file_path = UPLOAD_DIR / safe_name

            try:
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(base64_str))
                uploaded_urls.append(f"{base_url}/uploads/{safe_name}")
            except Exception as e:
                print(f"Failed to decode data URL: {e}")
                continue

    # 🔁 Return debug info in dev
    if not uploaded_urls:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No valid files or data URLs provided",
                "received": {
                    "file_count": len([f for f in files if f]) if files else 0,
                    "data_urls": file_data_urls
                }
            }
        )

    return {"urls": uploaded_urls}