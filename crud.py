# crud.py
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import DBUser, DBProperty, Event, Payment, Inventory, Room, Item, DefaultRoom, DefaultItem
from schemas import UserCreate, PropertyCreate, EventCreate, PaymentCreate, InventoryCreate
from typing import Dict, Any
from sync_to_wordpress import on_property_created, on_property_updated
from datetime import datetime, timezone
import asyncio

# ✅ Import the wrapper function
from sync_to_wordpress import on_property_created


async def get_user(db: AsyncSession, username: str):
    result = await db.execute(select(DBUser).where(DBUser.username == username))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: UserCreate):
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=user.password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


async def get_property(db: AsyncSession, property_id: int):
    result = await db.execute(
        select(DBProperty)
        .options(
            selectinload(DBProperty.inventory)
            .selectinload(Inventory.rooms)
            .selectinload(Room.items)
        )
        .where(DBProperty.id == property_id)
    )
    return result.scalar()


async def create_property(db: AsyncSession, property: PropertyCreate):
    # 1. Create the property
    db_property = DBProperty(**property.model_dump())
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)

    # 2. Create inventory for the property
    inventory = Inventory(property_id=db_property.id, property_name=db_property.title)
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)

    # 3. Get all default rooms
    result = await db.execute(select(DefaultRoom).order_by(DefaultRoom.order))
    default_rooms = result.scalars().all()

    for default_room in default_rooms:
        # 4. Create room
        room = Room(inventory_id=inventory.id, room_name=default_room.room_name)
        db.add(room)
        await db.commit()
        await db.refresh(room)

        # 5. Get all default items for this room
        result = await db.execute(
            select(DefaultItem).where(DefaultItem.room_name == default_room.room_name).order_by(DefaultItem.order)
        )
        default_items = result.scalars().all()

        for item in default_items:
            db_item = Item(
                room_id=room.id,
                name=item.name,
                brand=item.brand,
                value=item.value,
                condition=item.condition,
                owner=item.owner,
                notes=item.notes,
                photos=item.photos
            )
            db.add(db_item)

    await db.commit()
    return db_property


async def get_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    """
    Get a list of properties with pagination
    """
    result = await db.execute(
        select(DBProperty).offset(skip).limit(limit)
    )
    return result.scalars().all()
    

async def update_property(db: AsyncSession, property_id: int, updates: dict):
    db_property = await db.get(DBProperty, property_id)
    if not db_property:
        return None

    # Handle acf merge
    if "acf" in updates:
        if db_property.acf is None:
            db_property.acf = {}
        for group, data in updates["acf"].items():
            if group not in db_property.acf:
                db_property.acf[group] = {}
            if isinstance(data, dict):
                db_property.acf[group].update(data)
            else:
                db_property.acf[group] = data

    # Update top-level fields
    for key, value in updates.items():
        if key != "acf":
            setattr(db_property, key, value)

    db_property.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(db_property)
    return db_property
    
async def create_event(db: AsyncSession, event: EventCreate):
    db_event = Event(**event.model_dump())
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event


async def get_events(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Event).offset(skip).limit(limit))
    return result.scalars().all()
    

async def create_payment(db: AsyncSession, payment: PaymentCreate):
    db_payment = Payment(**payment.model_dump())
    db.add(db_payment)
    await db.commit()
    await db.refresh(db_payment)
    return db_payment

async def get_payments(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Payment).offset(skip).limit(limit))
    return result.scalars().all()
    
async def create_inventory_with_rooms(db: AsyncSession, inventory_data: dict):
    # Create inventory
    inventory = Inventory(
        property_id=inventory_data["property_id"],
        property_name=inventory_data["property_name"]
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)

    # Create rooms and items
    for room_data in inventory_data.get("rooms", []):
        room = Room(room_name=room_data["room_name"], inventory_id=inventory.id)
        db.add(room)
        await db.commit()
        await db.refresh(room)

        for item_data in room_data.get("items", []):
            item = Item(room_id=room.id, **item_data)
            db.add(item)

    await db.commit()
    return inventory
    
    
async def update_inventory_with_rooms(db: AsyncSession, inventory_id: int, inventory_data: dict):
    """
    Update inventory by deleting old rooms/items and recreating from new data
    """
    # Get existing inventory
    result = await db.execute(
        select(Inventory).where(Inventory.id == inventory_id)
    )
    inventory = result.scalar()
    if not inventory:
        return None

    # Update inventory basic data
    inventory.property_name = inventory_data.get("property_name", inventory.property_name)
    await db.commit()

    # Delete all rooms and items (cascade would handle this, but explicit for clarity)
    await db.execute(
        delete(Item).where(Item.room_id.in_(
            select(Room.id).where(Room.inventory_id == inventory_id)
        ))
    )
    await db.execute(
        delete(Room).where(Room.inventory_id == inventory_id)
    )
    await db.commit()

    # Recreate rooms and items
    for room_data in inventory_data.get("rooms", []):
        room = Room(
            room_name=room_data["room_name"],
            inventory_id=inventory.id
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)

        for item_data in room_data.get("items", []):
            item = Item(
                room_id=room.id,
                name=item_data["name"],
                brand=item_data.get("brand"),
                purchase_date=item_data.get("purchase_date"),
                value=item_data.get("value"),
                condition=item_data.get("condition"),
                owner=item_data.get("owner"),
                notes=item_data.get("notes"),
                photos=item_data.get("photos", [])
            )
            db.add(item)

    await db.commit()
    return inventory
    
    
async def get_inventory(db: AsyncSession, property_id: int):
    result = await db.execute(
        select(Inventory).where(Inventory.property_id == property_id)
    )
    return result.scalars().first()
    
    
async def get_inventories(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Inventory).offset(skip).limit(limit))
    return result.scalars().all()