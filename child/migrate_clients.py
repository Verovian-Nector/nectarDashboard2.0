import asyncio
from database import engine, Base, Client
from sqlalchemy import text

async def migrate():
    """Add subdomain and is_active columns to clients table"""
    async with engine.begin() as conn:
        # Check if the columns exist
        try:
            await conn.execute(text("SELECT subdomain FROM clients LIMIT 1"))
            print("Columns already exist, skipping migration")
        except Exception:
            print("Adding subdomain and is_active columns to clients table...")
            # Add the new columns
            await conn.execute(text("ALTER TABLE clients ADD COLUMN subdomain VARCHAR NOT NULL DEFAULT 'localhost'"))
            await conn.execute(text("ALTER TABLE clients ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
            print("Migration completed successfully")

if __name__ == "__main__":
    asyncio.run(migrate())