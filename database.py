# database.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from config import settings
import datetime

# Async engine
engine = create_async_engine(settings.DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    permissions = Column(JSON)  # Stores full CRUD permissions object
    properties = relationship("DBProperty", back_populates="owner", cascade="all, delete-orphan")


class DBProperty(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    address = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wordpress_id = Column(Integer, nullable=True)  # ID from WordPress

    # Nested modules stored as JSON
    tenant_info = Column(JSON)
    financial_info = Column(JSON)
    maintenance_records = Column(JSON)
    documents = Column(JSON)
    inventory = Column(JSON)
    inspections = Column(JSON)  # ← Legacy field (can be deprecated)

    # NEW: Store full ACF object
    acf = Column(JSON)  # Will hold inspection_group, financial_group, etc.

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("DBUser", back_populates="properties")


# Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session