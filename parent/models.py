from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
import uuid

Base = declarative_base()

class ClientSite(Base):
    __tablename__ = "client_sites"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False)
    subdomain = Column(String(63), unique=True, index=True, nullable=False)
    api_url = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=False)
    status = Column(String(20), default='active')  # active, suspended, deleted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_seen = Column(DateTime(timezone=True), nullable=True)  # Heartbeat timestamp
    settings = Column(JSON, default=dict)  # Store client site-specific settings
    extra_metadata = Column(JSON, default=dict)  # Store additional metadata
    
    def __repr__(self):
        return f"<ClientSite(id={self.id}, name='{self.name}', subdomain='{self.subdomain}', is_active={self.is_active})>"


class ClientSiteEvent(Base):
    __tablename__ = "client_site_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    client_site_id = Column(String(36), ForeignKey("client_sites.id"), index=True, nullable=False)
    type = Column(String(50), nullable=False)  # activation|deactivation|heartbeat|info|error
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    event_metadata = Column(JSON, default=dict, nullable=True)  # Store additional event data (renamed to avoid SQLAlchemy conflict)

    def __repr__(self):
        return f"<ClientSiteEvent(client_site_id={self.client_site_id}, type='{self.type}', message='{self.message}')>"


class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(63), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default='admin')  # super_admin, admin, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    extra_metadata = Column(JSON, default=dict)
    
    def __repr__(self):
        return f"<AdminUser(id={self.id}, email='{self.email}', username='{self.username}', role='{self.role}')>"


class ClientSiteProvisioningLog(Base):
    __tablename__ = "client_site_provisioning_log"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    client_site_id = Column(String(36), ForeignKey("client_sites.id"), nullable=False)
    subdomain = Column(String(63), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # create, update, delete, suspend, activate
    status = Column(String(20), default='pending')  # pending, in_progress, completed, failed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text)
    extra_metadata = Column(JSON, default=dict)
    
    def __repr__(self):
        return f"<ClientSiteProvisioningLog(client_site_id={self.client_site_id}, action='{self.action}', status='{self.status}')>"