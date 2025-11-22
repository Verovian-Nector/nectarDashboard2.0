# database.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey, Float, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from config import settings
from datetime import datetime, timezone
import logging
import uuid
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get client site context from request headers
def get_client_site_schema():
    """Get the current client site schema from request context"""
    from fastapi import Request
    from starlette.middleware.base import BaseHTTPMiddleware
    import contextvars
    
    # Use context variable to store current client site
    client_site_ctx = contextvars.ContextVar('current_client_site', default=None)
    return client_site_ctx.get()

async def on_property_created(property):
    logger.info(f"Syncing property to WordPress: {property.title}")
    # ... rest of logic


# Async engine (only for PostgreSQL)
# Pooling can be disabled via env settings (useful for pytest-asyncio strict mode)
_engine_kwargs = {"echo": True}
if getattr(settings, "DB_DISABLE_POOLING", False):
    _engine_kwargs["poolclass"] = NullPool

# Use async engine only for PostgreSQL, sync for SQLite
IS_SQLITE = settings.DATABASE_URL.lower().startswith("sqlite")
if IS_SQLITE:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker as sync_sessionmaker
    engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)
    SessionLocal = sync_sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Determine JSON storage type based on DB dialect (Postgres vs SQLite)
IS_POSTGRES = settings.DATABASE_URL.lower().startswith("postgres")
JSONFlexible = JSONB if IS_POSTGRES else JSON

if not IS_SQLITE:
    AsyncSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

Base = declarative_base()

# Client site-aware session factory
def get_client_site_session(client_site_subdomain: str):
    """Create a session for a specific client site (SQLite doesn't support schemas, so we use table prefixes)"""
    # For SQLite, we'll use the same database but filter by tenant context
    if IS_SQLITE:
        def client_site_session():
            session = SessionLocal()
            try:
                yield session
            finally:
                session.close()
    else:
        async def client_site_session():
            session = AsyncSessionLocal()
            try:
                yield session
            finally:
                await session.close()
    
    return client_site_session

class DBUser(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    username = Column(String(63), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    created_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc)
)
    updated_at = Column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    onupdate=lambda: datetime.now(timezone.utc)
)
    permissions = Column(JSONFlexible)  # Stores full CRUD permissions object
    properties = relationship("DBProperty", back_populates="owner", cascade="all, delete-orphan")


class DBProperty(Base):
    __tablename__ = "properties"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_properties_source_sourceid"),
        UniqueConstraint("wordpress_id", name="uq_properties_wordpress_id"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    address = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    wordpress_id = Column(Integer, nullable=True)  # ID from WordPress

    # Nested modules stored as JSON
    tenant_info = Column(JSONFlexible)
    financial_info = Column(JSONFlexible)
    maintenance_records = Column(JSONFlexible)
    documents = Column(JSONFlexible)
    inspections = Column(JSONFlexible)  # ← Legacy field (can be deprecated)

    # NEW: Store full ACF object
    acf = Column(JSONFlexible, nullable=True)  # Will hold inspection_group, financial_group, etc.

    # Integration/source metadata
    source = Column(String(50), nullable=True)  # e.g., 'wordpress_acf', 'custom_rest'
    source_id = Column(String(100), nullable=True)  # identifier from external source system
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    name_key = Column(String(255), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    date_of_birth = Column(String(50), nullable=True)
    employment_status = Column(String(50), nullable=True)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("DBUser", uselist=False)
    tenancies = relationship("DBTenancy", back_populates="tenant", cascade="all, delete-orphan")


class DBTenancy(Base):
    __tablename__ = "tenancies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    start_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=True)  # e.g., Verified | Pending | Unknown
    meta = Column(JSONFlexible, nullable=True)  # attachments and extra details
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("DBTenant", back_populates="tenancies")
    property = relationship("DBProperty", back_populates="tenancies")

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    event_name = Column(String(255), nullable=False)
    event_details = Column(Text, nullable=True)
    lease_date = Column(DateTime(timezone=True), nullable=True)
    incoming = Column(DateTime(timezone=True), nullable=True)
    outgoing = Column(DateTime(timezone=True), nullable=True)
    tenant = Column(String(255), nullable=True)
    incoming_color = Column(String(50), nullable=True)
    outgoing_color = Column(String(50), nullable=True)
    incoming_frequency = Column(String(50), nullable=True)
    incoming_type = Column(String(50), nullable=True)
    outgoing_type = Column(String(50), nullable=True)
    incoming_amount = Column(Float, nullable=True)
    outgoing_amount = Column(Float, nullable=True)
    status = Column(String(50), nullable=True)
    incoming_status = Column(String(50), nullable=True)
    outgoing_status = Column(String(50), nullable=True)
    checkout = Column(DateTime(timezone=True), nullable=True)
    property_type = Column(String(50), nullable=True)
    payment_date = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    property = relationship("DBProperty", back_populates="events")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))  # ✅ Fixed
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)
    property_type = Column(String(50), nullable=True)
    payment_type = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    tenant = Column(String(255), nullable=True)

    property = relationship("DBProperty", back_populates="payments")


class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    property_id = Column(String(36), ForeignKey("properties.id"), unique=True, nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    property_name = Column(String(255), nullable=False)

    # Relationships
    property = relationship("DBProperty", back_populates="inventory")
    rooms = relationship("Room", back_populates="inventory", cascade="all, delete-orphan", lazy="selectin")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    inventory_id = Column(String(36), ForeignKey("inventories.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    room_name = Column(String(255), nullable=False)
    room_type = Column(String(100))

    # Relationship
    inventory = relationship("Inventory", back_populates="rooms")
    items = relationship("Item", back_populates="room", cascade="all, delete-orphan",lazy="selectin")


class Item(Base):
    __tablename__ = "items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    client_site_id = Column(String(100), nullable=False, index=True)  # Tenant isolation
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    value = Column(Float, nullable=True)
    condition = Column(String(100), nullable=True)
    owner = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    photos = Column(JSONFlexible, nullable=True)  # Store list of URLs
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
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    room_name = Column(String(255), nullable=False, unique=True)  # e.g., "Bedroom"
    order = Column(Integer, default=0)


class DefaultItem(Base):
    __tablename__ = "default_items"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    room_name = Column(String(255), nullable=False)  # Links to DefaultRoom
    name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    value = Column(Float, nullable=True)
    condition = Column(String(100), nullable=True)
    owner = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    photos = Column(JSONFlexible, nullable=True)
    order = Column(Integer, default=0)


# ==================== Clients & Integration Configs ====================
class Client(Base):
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), unique=True, nullable=False)
    subdomain = Column(String(63), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False)
    integration_type = Column(String(50), nullable=False)  # e.g., 'wordpress_acf', 'custom_rest'
    direction = Column(String(20), nullable=False)  # 'inbound' | 'outbound' | 'bidirectional'
    source_of_truth = Column(String(20), nullable=False, default="dashboard")  # 'dashboard' | 'external'
    endpoint_url = Column(String(500), nullable=True)
    auth_type = Column(String(50), nullable=True)  # e.g., 'basic', 'bearer', 'apikey', 'none'
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    # Core identity
    app_title = Column(String(255), nullable=False, default="Nectar Estate")
    logo_url = Column(String(500), nullable=True, default="/logo.png")  # Path served by frontend/public
    favicon_url = Column(String(500), nullable=True)
    # Theme
    font_family = Column(String(500), nullable=True, default="Asap, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif")
    primary_color = Column(String(50), nullable=True, default="#2A7B88")
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
if IS_SQLITE:
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
else:
    async def get_db():
        async with AsyncSessionLocal() as session:
            yield session


# ==================== Dead-Letter Queue ====================
class DeadLetter(Base):
    __tablename__ = "dead_letters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    entity_type = Column(String(50), nullable=False, default="property")
    property_id = Column(String(36), ForeignKey("properties.id"), nullable=True)
    config_id = Column(String(36), ForeignKey("integration_configs.id"), nullable=True)
    integration_type = Column(String(50), nullable=False)
    operation = Column(String(20), nullable=False)  # 'outbound' | 'inbound'
    payload = Column(JSONFlexible, nullable=True)
    error_message = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)