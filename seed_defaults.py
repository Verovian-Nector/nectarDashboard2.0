# seed_defaults.py
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine, Base, AsyncSessionLocal
from database import DefaultRoom, DefaultItem  # ✅ Import from database.py

async def seed_defaults():
    async with AsyncSessionLocal() as db:
        # Default Rooms
        bedroom = DefaultRoom(room_name="Bedroom", order=1)
        bathroom = DefaultRoom(room_name="Bathroom", order=2)
        kitchen = DefaultRoom(room_name="Kitchen", order=3)

        db.add_all([bedroom, bathroom, kitchen])
        await db.commit()

        # Default Items
        items = [
            DefaultItem(room_name="Bedroom", name="Bed", brand="IKEA", value=500, condition="New", order=1),
            DefaultItem(room_name="Bedroom", name="Pillow", brand="IKEA", value=30, condition="New", order=2),
            DefaultItem(room_name="Bathroom", name="Sink", value=200, condition="New", order=1),
            DefaultItem(room_name="Kitchen", name="Oven", value=800, condition="New", order=1),
        ]

        db.add_all(items)
        await db.commit()

        print("✅ Default rooms and items seeded!")

# Run it
asyncio.run(seed_defaults())