import os
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure project root is on sys.path when running as a script
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from database import engine, Base, AsyncSessionLocal, DBUser
from security import get_password_hash


async def ensure_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_admin():
    """
    Create or update a default admin user for local development.

    Environment overrides:
      - ADMIN_USERNAME (default: 'admin')
      - ADMIN_EMAIL (default: 'admin@example.com')
      - ADMIN_PASSWORD (default: 'NectarDev123!')
      - ADMIN_ROLE (default: 'propertyadmin')
    """
    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    password = os.getenv("ADMIN_PASSWORD", "NectarDev123!")
    role = os.getenv("ADMIN_ROLE", "propertyadmin")

    hashed = get_password_hash(password)

    await ensure_tables()

    async with AsyncSessionLocal() as db:  # type: AsyncSession
        result = await db.execute(select(DBUser).where(DBUser.username == username))
        existing = result.scalars().first()

        if existing:
            existing.email = email
            existing.hashed_password = hashed
            existing.role = role
            await db.commit()
            await db.refresh(existing)
            print(f"✅ Updated admin user '{username}' (id={existing.id}).")
        else:
            user = DBUser(
                username=username,
                email=email,
                hashed_password=hashed,
                role=role,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"✅ Created admin user '{username}' (id={user.id}).")

        print("\nLogin details:")
        print(f"  username: {username}")
        print(f"  password: {password}")
        print(f"  role:     {role}")


if __name__ == "__main__":
    asyncio.run(seed_admin())