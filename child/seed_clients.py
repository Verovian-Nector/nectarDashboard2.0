import asyncio
from database import AsyncSessionLocal, Client
from sqlalchemy import select

async def seed_clients():
    """Seed default clients for testing"""
    async with AsyncSessionLocal() as db:
        # Check if clients already exist
        result = await db.execute(select(Client))
        existing_clients = result.scalars().all()
        
        if existing_clients:
            print(f"Clients already exist: {len(existing_clients)}")
            return
        
        # Create default clients
        parent_client = Client(
            name="Parent Tenant",
            subdomain="localhost"
        )
        
        child_client = Client(
            name="Child Tenant",
            subdomain="child"
        )
        
        db.add(parent_client)
        db.add(child_client)
        await db.commit()
        
        print("Seeded default clients successfully")

if __name__ == "__main__":
    asyncio.run(seed_clients())