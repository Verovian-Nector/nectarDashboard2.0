import asyncio
from database import AsyncSessionLocal, Client
from sqlalchemy import select

async def check_clients():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Client))
        clients = result.scalars().all()
        print(f'Found {len(clients)} clients:')
        for client in clients:
            print(f'  ID: {client.id}, Name: {client.name}, Subdomain: {getattr(client, "subdomain", "MISSING")}')

if __name__ == "__main__":
    asyncio.run(check_clients())