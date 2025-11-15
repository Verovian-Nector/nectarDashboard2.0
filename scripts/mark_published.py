import sys
import asyncio
from pathlib import Path

# Ensure project root is on sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import AsyncSessionLocal, DBProperty


async def mark_published(prop_id: int):
    async with AsyncSessionLocal() as db:  # type: AsyncSession
        result = await db.execute(select(DBProperty).where(DBProperty.id == prop_id))
        prop = result.scalars().first()
        if not prop:
            print(f"Property id={prop_id} not found")
            return
        prop.published = True
        await db.commit()
        await db.refresh(prop)
        print(f"✅ Marked property id={prop.id} as published.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/mark_published.py <property_id>")
        sys.exit(1)
    pid = int(sys.argv[1])
    asyncio.run(mark_published(pid))