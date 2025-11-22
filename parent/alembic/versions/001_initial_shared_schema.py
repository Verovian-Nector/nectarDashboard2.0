"""Initial migration: Create shared schema and system tables

Revision ID: 001_initial_shared_schema
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_shared_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create shared schema
    op.execute("CREATE SCHEMA IF NOT EXISTS shared")
    
    # Create extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "btree_gin"')
    
    # Create tenants table
    op.create_table(
        'tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('subdomain', sa.String(length=63), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('api_url', sa.String(length=500), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subdomain'),
        sa.CheckConstraint("status IN ('active', 'suspended', 'deleted')", name='tenant_status_check'),
        schema='shared'
    )
    
    # Create admin_users table
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=63), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        sa.CheckConstraint("role IN ('super_admin', 'admin', 'viewer')", name='admin_role_check'),
        schema='shared'
    )
    
    # Create tenant_provisioning_log table
    op.create_table(
        'tenant_provisioning_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subdomain', sa.String(length=63), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['shared.tenants.id'], ondelete='CASCADE'),
        sa.CheckConstraint("action IN ('create', 'update', 'delete', 'suspend', 'activate')", name='provisioning_action_check'),
        sa.CheckConstraint("status IN ('pending', 'in_progress', 'completed', 'failed')", name='provisioning_status_check'),
        schema='shared'
    )
    
    # Create tenant_events table
    op.create_table(
        'tenant_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['shared.tenants.id'], ondelete='CASCADE'),
        sa.CheckConstraint("type IN ('activation', 'deactivation', 'heartbeat', 'info', 'error')", name='event_type_check'),
        schema='shared'
    )
    
    # Create indexes
    op.create_index('idx_tenants_subdomain', 'tenants', ['subdomain'], unique=False, schema='shared')
    op.create_index('idx_tenants_status', 'tenants', ['status'], unique=False, schema='shared')
    op.create_index('idx_admin_users_email', 'admin_users', ['email'], unique=False, schema='shared')
    op.create_index('idx_admin_users_username', 'admin_users', ['username'], unique=False, schema='shared')
    op.create_index('idx_tenant_provisioning_log_tenant_id', 'tenant_provisioning_log', ['tenant_id'], unique=False, schema='shared')
    op.create_index('idx_tenant_provisioning_log_subdomain', 'tenant_provisioning_log', ['subdomain'], unique=False, schema='shared')
    op.create_index('idx_tenant_events_tenant_id', 'tenant_events', ['tenant_id'], unique=False, schema='shared')
    
    # Insert default admin user (password: admin123)
    op.execute("""
        INSERT INTO shared.admin_users (email, username, hashed_password, full_name, role, is_active)
        VALUES ('admin@nectar.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'System Administrator', 'super_admin', true)
        ON CONFLICT (email) DO NOTHING
    """)
    
    # Create functions for tenant schema management
    op.execute("""
        CREATE OR REPLACE FUNCTION shared.create_tenant_schema(tenant_subdomain VARCHAR)
        RETURNS UUID AS $$
        DECLARE
            tenant_id UUID;
            schema_name VARCHAR;
        BEGIN
            -- Generate tenant ID
            tenant_id := uuid_generate_v4();
            schema_name := 'tenant_' || tenant_subdomain;
            
            -- Insert tenant record
            INSERT INTO shared.tenants (id, subdomain, name, status, api_url)
            VALUES (tenant_id, tenant_subdomain, tenant_subdomain, 'active', 'http://' || tenant_subdomain || '.yourdomain.com');
            
            -- Create tenant-specific schema
            EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
            
            -- Grant permissions to application user
            EXECUTE format('GRANT ALL ON SCHEMA %I TO current_user', schema_name);
            EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO current_user', schema_name);
            EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO current_user', schema_name);
            
            RETURN tenant_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
    
    op.execute("""
        CREATE OR REPLACE FUNCTION shared.drop_tenant_schema(tenant_subdomain VARCHAR)
        RETURNS VOID AS $$
        DECLARE
            schema_name VARCHAR;
        BEGIN
            schema_name := 'tenant_' || tenant_subdomain;
            
            -- Drop tenant schema with all objects
            EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
            
            -- Delete tenant record
            DELETE FROM shared.tenants WHERE subdomain = tenant_subdomain;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)


def downgrade() -> None:
    # Drop functions
    op.execute("DROP FUNCTION IF EXISTS shared.create_tenant_schema(VARCHAR)")
    op.execute("DROP FUNCTION IF EXISTS shared.drop_tenant_schema(VARCHAR)")
    
    # Drop indexes
    op.drop_index('idx_tenant_events_tenant_id', table_name='tenant_events', schema='shared')
    op.drop_index('idx_tenant_provisioning_log_subdomain', table_name='tenant_provisioning_log', schema='shared')
    op.drop_index('idx_tenant_provisioning_log_tenant_id', table_name='tenant_provisioning_log', schema='shared')
    op.drop_index('idx_admin_users_username', table_name='admin_users', schema='shared')
    op.drop_index('idx_admin_users_email', table_name='admin_users', schema='shared')
    op.drop_index('idx_tenants_status', table_name='tenants', schema='shared')
    op.drop_index('idx_tenants_subdomain', table_name='tenants', schema='shared')
    
    # Drop tables
    op.drop_table('tenant_events', schema='shared')
    op.drop_table('tenant_provisioning_log', schema='shared')
    op.drop_table('admin_users', schema='shared')
    op.drop_table('tenants', schema='shared')
    
    # Drop schema
    op.execute("DROP SCHEMA IF EXISTS shared")
    
    # Drop extensions
    op.execute('DROP EXTENSION IF EXISTS "btree_gin"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')