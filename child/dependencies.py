# dependencies.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from auth import get_current_user


def require_permission(section: str, action: str):
    """
    ✅ Sync function that returns an async dependency
    Usage: Depends(require_permission("properties", "create"))
    """
    async def check_permission(
        current_user: dict = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        # Allow propertyadmin full access (optional)
        if current_user.role == "propertyadmin":
            return current_user

        # Check if user has permissions
        if not current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No permissions assigned"
            )

        perms = current_user.permissions.get(section)
        if not perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No access to {section}"
            )

        if not perms.get(action, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not allowed to {action} {section}"
            )

        return current_user

    return check_permission  # ✅ Return the async function (not await it)