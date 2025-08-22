from sqlalchemy.ext.asyncio import AsyncSession
from database import engine, Base, AsyncSessionLocal
from crud import get_user, create_user
from security import get_password_hash
from schemas import UserCreate

async def reset_password():
    async with AsyncSessionLocal() as db:
        # Get user
        user = await get_user(db, "tar@docket.one")
        if user:
            # Reset password
            user.hashed_password = get_password_hash("Galvatron101!")
            await db.commit()
            print("✅ Password reset for tar@docket.one")
        else:
            print("❌ User not found")

# Run it
import asyncio
asyncio.run(reset_password())