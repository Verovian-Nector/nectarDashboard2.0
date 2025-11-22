"""Rename tenant_events.metadata to event_metadata

Revision ID: 002_rename_tenant_event_metadata
Revises: 001_initial_shared_schema
Create Date: 2025-11-16 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_rename_tenant_event_metadata'
down_revision = '001_initial_shared_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename metadata column to event_metadata in tenant_events table
    op.alter_column('tenant_events', 'metadata', 
                    new_column_name='event_metadata',
                    schema='shared')


def downgrade() -> None:
    # Rename event_metadata column back to metadata in tenant_events table
    op.alter_column('tenant_events', 'event_metadata', 
                    new_column_name='metadata',
                    schema='shared')