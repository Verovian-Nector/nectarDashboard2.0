# database.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from config import settings
from datetime import datetime, timezone

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
    
    # Relationships
    events = relationship("Event", back_populates="property", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="property", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="property", uselist=False, cascade="all, delete-orphan")

    owner = relationship("DBUser", back_populates="properties")
    
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    event_name = Column(String, nullable=False)
    event_details = Column(String, nullable=True)
    lease_date = Column(DateTime, nullable=True)
    incoming = Column(DateTime, nullable=True)
    outgoing = Column(DateTime, nullable=True)
    tenant = Column(String, nullable=True)
    incoming_color = Column(String, nullable=True)
    outgoing_color = Column(String, nullable=True)
    incoming_frequency = Column(String, nullable=True)
    incoming_type = Column(String, nullable=True)
    outgoing_type = Column(String, nullable=True)
    incoming_amount = Column(Float, nullable=True)
    outgoing_amount = Column(Float, nullable=True)
    status = Column(String, nullable=True)
    incoming_status = Column(String, nullable=True)
    outgoing_status = Column(String, nullable=True)
    checkout = Column(DateTime, nullable=True)
    property_type = Column(String, nullable=True)
    payment_date = Column(DateTime, nullable=True)

    # Relationship
    property = relationship("DBProperty", back_populates="events")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))  # ✅ Fixed
    amount = Column(Float, nullable=False)
    category = Column(String, nullable=True)
    property_type = Column(String, nullable=True)
    payment_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=True)
    tenant = Column(String, nullable=True)

    property = relationship("DBProperty", back_populates="payments")


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), unique=True, nullable=False)
    property_name = Column(String, nullable=False)

    # Relationships
    property = relationship("DBProperty", back_populates="inventory")
    rooms = relationship("Room", back_populates="inventory", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventories.id"), nullable=False)
    room_name = Column(String, nullable=False)

    # Relationship
    inventory = relationship("Inventory", back_populates="rooms")
    items = relationship("Item", back_populates="room", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    purchase_date = Column(DateTime, nullable=True)
    value = Column(Float, nullable=True)
    condition = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    photos = Column(JSON, nullable=True)  # Store list of URLs
    created = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.utcnow)

    # Relationship
    room = relationship("Room", back_populates="items")
    
    
class DefaultRoom(Base):
    __tablename__ = "default_rooms"
    id = Column(Integer, primary_key=True, index=True)
    room_name = Column(String, nullable=False, unique=True)  # e.g., "Bedroom"
    order = Column(Integer, default=0)


class DefaultItem(Base):
    __tablename__ = "default_items"
    id = Column(Integer, primary_key=True, index=True)
    room_name = Column(String, nullable=False)  # Links to DefaultRoom
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    value = Column(Float, nullable=True)
    condition = Column(String, nullable=True)
    owner = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    photos = Column(JSON, nullable=True)
    order = Column(Integer, default=0)


# Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session