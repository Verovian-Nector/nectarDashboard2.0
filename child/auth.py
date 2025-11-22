# auth.py
import datetime as dt
from authlib.jose import jwt, JoseError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Callable

# ✅ Correct imports
from database import get_db
from crud import get_user
from config import settings
from security import verify_password  # ← From new file
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


async def authenticate_user(db: AsyncSession, username: str, password: str, client_site_id: str = None):
    user = await get_user(db, username, client_site_id)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    # Block sign-in for deactivated accounts with a clear message
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact your administrator.",
        )
    return user


def create_access_token(data: dict, client_id: str = None):
    to_encode = data.copy()
    expire_at = int((dt.datetime.now(dt.UTC) + dt.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp())
    to_encode.update({"exp": expire_at})
    
    # Add client_id to JWT payload for tenant isolation
    if client_id:
        to_encode.update({"client_id": client_id})
    
    header = {"alg": settings.ALGORITHM}
    return jwt.encode(header, to_encode, settings.SECRET_KEY)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    client_site_id: str = None
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = jwt.decode(token, settings.SECRET_KEY)
        # Validate registered claims like exp/nbf/iat
        claims.validate()
        username: str = claims.get("sub")
        if username is None:
            raise credentials_exception
        # Extract client_id from JWT for tenant isolation
        client_site_id = claims.get("client_id")
    except JoseError:
        raise credentials_exception
    user = await get_user(db, username=username, client_site_id=client_site_id)
    if user is None:
        raise credentials_exception
    # Reject requests from deactivated accounts
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive account. Please contact your administrator.",
        )
    return user