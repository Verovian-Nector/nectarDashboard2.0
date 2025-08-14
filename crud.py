# crud.py
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from database import DBUser, DBProperty
from schemas import UserCreate, PropertyCreate
from typing import Dict, Any
import datetime

async def get_user(db: AsyncSession, username: str):
    result = await db.execute(select(DBUser).where(DBUser.username == username))
    return result.scalars().first()

async def create_user(db: AsyncSession, user: UserCreate):
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=user.password,  # Assume already hashed
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(DBProperty).offset(skip).limit(limit))
    return result.scalars().all()

async def create_property(db: AsyncSession, property: PropertyCreate):
    db_property = DBProperty(**property.model_dump())
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)
    return db_property

async def update_property(db: AsyncSession, property_id: int, updates: dict):
    await db.execute(
        update(DBProperty)
        .where(DBProperty.id == property_id)
        .values(**updates)
    )
    await db.commit()
    return await get_property(db, property_id)

async def get_property(db: AsyncSession, property_id: int):
    return await db.get(DBProperty, property_id)

async def update_property_inspection(
    db: AsyncSession,
    property_id: int,
    inspection_data: Dict[str, Any]
):
    property = await get_property(db, property_id)
    if not property:
        return None
    if property.inspections is None:
        property.inspections = []
    property.inspections.append({**inspection_data, "updated_at": datetime.datetime.utcnow().isoformat()})
    await db.commit()
    await db.refresh(property)
    return property