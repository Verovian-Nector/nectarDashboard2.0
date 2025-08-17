# crud.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import DBUser, DBProperty
from schemas import UserCreate, PropertyCreate
from typing import Dict, Any
import datetime
import asyncio  # ✅ Add this

# ✅ Import the wrapper function
from .sync_to_wordpress import on_property_created


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


async def get_properties(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(DBProperty).offset(skip).limit(limit))
    return result.scalars().all()


async def create_property(db: AsyncSession, property: PropertyCreate):
    print("🔧 Creating property in DB...")
    print("📥 Data:", property.model_dump())

    db_property = DBProperty(**property.model_dump())
    db.add(db_property)
    await db.commit()
    await db.refresh(db_property)

    # ✅ Call the wrapper function
    asyncio.create_task(on_property_created(db_property))

    return db_property


async def get_property(db: AsyncSession, property_id: int):
    return await db.get(DBProperty, property_id)


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

    db_property.updated_at = datetime.datetime.utcnow()

    await db.commit()
    await db.refresh(db_property)
    return db_property