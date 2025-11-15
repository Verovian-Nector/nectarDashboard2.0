# database.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from config import settings
from datetime import datetime, timezone
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def on_property_created(property):
    logger.info(f"Syncing property to WordPress: {property.title}")
    # ... rest of logic


# Async engine
# Pooling can be disabled via env settings (useful for pytest-asyncio strict mode)
_engine_kwargs = {"echo": True}
if getattr(settings, "DB_DISABLE_POOLING", False):
    _engine_kwargs["poolclass"] = NullPool
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Determine JSON storage type based on DB dialect (Postgres vs SQLite)
IS_POSTGRES = settings.DATABASE_URL.lower().startswith("postgres")
JSONFlexible = JSONB if IS_POSTGRES else JSON

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
    created_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc)
)
    permissions = Column(JSON)  # Stores full CRUD permissions object
    properties = relationship("DBProperty", back_populates="owner", cascade="all, delete-orphan")


class DBProperty(Base):
    __tablename__ = "properties"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_properties_source_sourceid"),
        UniqueConstraint("wordpress_id", name="uq_properties_wordpress_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wordpress_id = Column(Integer, nullable=True)  # ID from WordPress

    # Nested modules stored as JSON
    tenant_info = Column(JSON)
    financial_info = Column(JSON)
    maintenance_records = Column(JSON)
    documents = Column(JSON)
    inspections = Column(JSON)  # ← Legacy field (can be deprecated)

    # NEW: Store full ACF object
    acf = Column(JSONFlexible, nullable=True)  # Will hold inspection_group, financial_group, etc.

    # Integration/source metadata
    source = Column(String, nullable=True)  # e.g., 'wordpress_acf', 'custom_rest'
    source_id = Column(String, nullable=True)  # identifier from external source system
    source_last_sync_at = Column(DateTime(timezone=True), nullable=True)
    published = Column(Boolean, default=False)

    created_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc)
)
    updated_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    onupdate=lambda: datetime.now(timezone.utc)
)
    
    # Relationships
    events = relationship("Event", back_populates="property", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="property", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="property", uselist=False, cascade="all, delete-orphan")
    # Tenancies history
    tenancies = relationship("DBTenancy", back_populates="property", cascade="all, delete-orphan")

    owner = relationship("DBUser", back_populates="properties")
    
class DBTenant(Base):
    __tablename__ = "tenants"
    __table_args__ = (
        UniqueConstraint("email", name="uq_tenants_email"),
        UniqueConstraint("name_key", "date_of_birth", name="uq_tenants_name_dob"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    name_key = Column(String, nullable=True, index=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    employment_status = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("DBUser", uselist=False)
    tenancies = relationship("DBTenancy", back_populates="tenant", cascade="all, delete-orphan")


class DBTenancy(Base):
    __tablename__ = "tenancies"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=True)  # e.g., Verified | Pending | Unknown
    meta = Column(JSONFlexible, nullable=True)  # attachments and extra details
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("DBTenant", back_populates="tenancies")
    property = relationship("DBProperty", back_populates="tenancies")

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
    rooms = relationship("Room", back_populates="inventory", cascade="all, delete-orphan", lazy="selectin")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventories.id"), nullable=False)
    room_name = Column(String, nullable=False)
    room_type = Column(String)

    # Relationship
    inventory = relationship("Inventory", back_populates="rooms")
    items = relationship("Item", back_populates="room", cascade="all, delete-orphan",lazy="selectin")


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
    created = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    quantity = Column(Integer, default=1)
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


# ==================== Clients & Integration Configs ====================
class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    integration_type = Column(String, nullable=False)  # e.g., 'wordpress_acf', 'custom_rest'
    direction = Column(String, nullable=False)  # 'inbound' | 'outbound' | 'bidirectional'
    source_of_truth = Column(String, nullable=False, default="dashboard")  # 'dashboard' | 'external'
    endpoint_url = Column(String, nullable=True)
    auth_type = Column(String, nullable=True)  # e.g., 'basic', 'bearer', 'apikey', 'none'
    auth_config = Column(JSONFlexible, nullable=True)  # e.g., {username, password} or {api_key}
    field_mappings = Column(JSONFlexible, nullable=True)  # canonical -> external mapping
    transforms = Column(JSONFlexible, nullable=True)  # per-field transform rules
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    client = relationship("Client")


# ==================== Instance-wide Branding ====================
class BrandSettings(Base):
    __tablename__ = "brand_settings"

    id = Column(Integer, primary_key=True, index=True)
    # Core identity
    app_title = Column(String, nullable=False, default="Nectar Estate")
    logo_url = Column(String, nullable=True, default="/logo.png")  # Path served by frontend/public
    favicon_url = Column(String, nullable=True)
    # Theme
    font_family = Column(String, nullable=True, default="Asap, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif")
    primary_color = Column(String, nullable=True, default="#2A7B88")
    brand_palette = Column(JSONFlexible, nullable=True)  # Array of 10 shades for Mantine palette
    dark_mode_default = Column(Boolean, default=False)
    theme_overrides = Column(JSONFlexible, nullable=True)
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )


# Dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ==================== Dead-Letter Queue ====================
class DeadLetter(Base):
    __tablename__ = "dead_letters"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False, default="property")
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    config_id = Column(Integer, ForeignKey("integration_configs.id"), nullable=True)
    integration_type = Column(String, nullable=False)
    operation = Column(String, nullable=False)  # 'outbound' | 'inbound'
    payload = Column(JSONFlexible, nullable=True)
    error_message = Column(String, nullable=True)
    attempt_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)