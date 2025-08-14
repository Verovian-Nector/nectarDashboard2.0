# main.py
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import datetime

# ✅ Correct imports
from database import engine, get_db, Base, DBUser, DBProperty
from schemas import UserCreate, UserResponse, PropertyCreate, PropertyResponse, PropertyUpdate, Token, PropertyInspectionUpdate
from crud import get_user, create_user, get_properties, create_property, update_property, update_property_inspection
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash  # ✅ Add get_password_hash here

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ==================== AUTH ENDPOINTS ====================

@app.post( "/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/users", response_model=UserResponse)
async def create_user_endpoint(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    existing_user = await get_user(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    db_user = DBUser(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


# ==================== PROPERTY ENDPOINTS ====================

@app.get("/properties", response_model=List[PropertyResponse])
async def read_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db)
):
    return await get_properties(db, skip=skip, limit=limit)


@app.post("/properties", response_model=PropertyResponse)
async def create_new_property(
    property: PropertyCreate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await create_property(db, property)


# ==================== USER MANAGEMENT ====================

@app.get("/users", response_model=List[UserResponse])
async def read_users(
    roles: str = Query("propertyManager,propertyowner,propertyadmin"),
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role_list = [role.strip() for role in roles.split(",") if role.strip()]
    result = await db.execute(
        select(DBUser).where(DBUser.role.in_(role_list)).where(DBUser.is_active == True)
    )
    users = result.scalars().all()
    if not users:
        raise HTTPException(status_code=404, detail="No users found with given roles")
    return users


# ==================== PROPERTY UPDATE ENDPOINTS ====================

@app.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_existing_property(
    property_id: int,
    property_update: PropertyUpdate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_property = await db.get(DBProperty, property_id)
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    updates = property_update.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(db_property, key, value)
    db_property.updated_at = datetime.datetime.utcnow()
    await db.commit()
    await db.refresh(db_property)
    return db_property


@app.put("/properties/{property_id}/inspection", response_model=PropertyResponse)
async def update_property_inspection_endpoint(
    property_id: int,
    inspection_update: PropertyInspectionUpdate,
    current_user: DBUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    property = await db.get(DBProperty, property_id)
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    if property.owner_id != current_user.id and current_user.role != "propertyadmin":
        raise HTTPException(status_code=403, detail="Not authorized to update this property")
    if property.inspections is None:
        property.inspections = []
    property.inspections.append({**inspection_update.model_dump(), "updated_at": datetime.datetime.utcnow().isoformat()})
    await db.commit()
    await db.refresh(property)
    return property