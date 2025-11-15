# seed_defaults.py
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import engine, Base, AsyncSessionLocal
from database import DefaultRoom, DefaultItem  # ✅ Import from database.py


async def ensure_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_defaults():
    await ensure_tables()

    rooms_definitions = [
        {"room_name": "Bedroom", "order": 1},
        {"room_name": "Bathroom", "order": 2},
        {"room_name": "Kitchen", "order": 3},
        {"room_name": "Living Room", "order": 4},
        {"room_name": "Parking Space", "order": 5},
    ]

    items_definitions = [
        # Bedroom
        {
            "room_name": "Bedroom",
            "name": "Bed",
            "brand": "IKEA",
            "value": 500,
            "condition": "New",
            "owner": "Nectar",
            "notes": "Seeded default item",
            "photos": [
                "http://localhost:5174/vite.svg",
                "https://images.unsplash.com/photo-1595526114035-e1ac3cdc5571?w=800&q=80&auto=format&fit=crop"
            ],
            "order": 1
        },
        {
            "room_name": "Bedroom",
            "name": "Pillow",
            "brand": "IKEA",
            "value": 30,
            "condition": "New",
            "owner": "Nectar",
            "notes": "Seeded default item",
            "photos": [
                "http://localhost:5174/vite.svg"
            ],
            "order": 2
        },
        # Bathroom
        {
            "room_name": "Bathroom",
            "name": "Sink",
            "brand": None,
            "value": 200,
            "condition": "New",
            "owner": "Landlord",
            "notes": "Seeded default item",
            "photos": [
                "https://images.unsplash.com/photo-1576941086063-9f3da7b32fcd?w=800&q=80&auto=format&fit=crop"
            ],
            "order": 1
        },
        # Kitchen
        {
            "room_name": "Kitchen",
            "name": "Oven",
            "brand": None,
            "value": 800,
            "condition": "New",
            "owner": "Landlord",
            "notes": "Seeded default item",
            "photos": [
                "https://images.unsplash.com/photo-1517954079470-7a15c6e3d9f3?w=800&q=80&auto=format&fit=crop"
            ],
            "order": 1
        },
        # Living Room
        {
            "room_name": "Living Room",
            "name": "Sofa",
            "brand": "IKEA",
            "value": 350,
            "condition": "New",
            "owner": "Nectar",
            "notes": "Seeded default item",
            "photos": [
                "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80&auto=format&fit=crop"
            ],
            "order": 1
        },
        {
            "room_name": "Living Room",
            "name": "Coffee Table",
            "brand": "IKEA",
            "value": 120,
            "condition": "New",
            "owner": "Nectar",
            "notes": "Seeded default item",
            "photos": [
                "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80&auto=format&fit=crop"
            ],
            "order": 2
        },
        # Parking Space
        {
            "room_name": "Parking Space",
            "name": "Parking Permit",
            "brand": None,
            "value": 0,
            "condition": "New",
            "owner": "Nectar",
            "notes": "Seeded default item",
            "photos": [
                "http://localhost:5174/vite.svg"
            ],
            "order": 1
        },
    ]

    created_rooms = 0
    updated_rooms = 0
    created_items = 0
    updated_items = 0

    async with AsyncSessionLocal() as db:  # type: AsyncSession
        # Upsert rooms by room_name
        for rd in rooms_definitions:
            result = await db.execute(select(DefaultRoom).where(DefaultRoom.room_name == rd["room_name"]))
            existing = result.scalars().first()
            if existing:
                # Update order if changed
                if existing.order != rd["order"]:
                    existing.order = rd["order"]
                    updated_rooms += 1
            else:
                db.add(DefaultRoom(room_name=rd["room_name"], order=rd["order"]))
                created_rooms += 1

        await db.commit()

        # Upsert items by (room_name, name)
        for idf in items_definitions:
            result = await db.execute(
                select(DefaultItem).where(
                    DefaultItem.room_name == idf["room_name"],
                    DefaultItem.name == idf["name"],
                )
            )
            existing_item = result.scalars().first()
            if existing_item:
                # Update fields if changed
                changed = False
                for key in ("brand", "value", "condition", "owner", "notes", "photos", "order"):
                    if getattr(existing_item, key) != idf.get(key):
                        setattr(existing_item, key, idf.get(key))
                        changed = True
                if changed:
                    updated_items += 1
            else:
                db.add(DefaultItem(**idf))
                created_items += 1

        await db.commit()

        print("✅ Defaults seeding complete.")
        print(f"Rooms -> created: {created_rooms}, updated: {updated_rooms}")
        print(f"Items -> created: {created_items}, updated: {updated_items}")


# Run it
asyncio.run(seed_defaults())