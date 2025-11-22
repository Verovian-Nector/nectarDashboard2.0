-- Multi-client-site PostgreSQL Database Initialization Script
-- This script sets up the database for schema-per-client-site isolation

-- Create database and user if they don't exist
CREATE DATABASE IF NOT EXISTS nectar_dashboard;
CREATE USER IF NOT EXISTS nectar_user WITH PASSWORD 'nectar_password';
GRANT ALL PRIVILEGES ON DATABASE nectar_dashboard TO nectar_user;

-- Connect to the database
\c nectar_dashboard;

-- Create extensions for UUID support and JSON operations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create a shared schema for system-wide data
CREATE SCHEMA IF NOT EXISTS shared;

-- Create system-wide tables in shared schema
CREATE TABLE IF NOT EXISTS shared.client_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create admin users table in shared schema (for parent dashboard)
CREATE TABLE IF NOT EXISTS shared.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(63) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create client site provisioning log in shared schema
CREATE TABLE IF NOT EXISTS shared.client_site_provisioning_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_site_id UUID REFERENCES shared.client_sites(id) ON DELETE CASCADE,
    subdomain VARCHAR(63) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'suspend', 'activate')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create function to automatically create client site schema
CREATE OR REPLACE FUNCTION create_client_site_schema(client_site_subdomain VARCHAR)
RETURNS UUID AS $$
DECLARE
    client_site_id UUID;
    schema_name VARCHAR;
BEGIN
    -- Generate client site ID
    client_site_id := uuid_generate_v4();
    schema_name := 'client_site_' || client_site_subdomain;
    
    -- Insert client site record
    INSERT INTO shared.client_sites (id, subdomain, name, status)
    VALUES (client_site_id, client_site_subdomain, client_site_subdomain, 'active');
    
    -- Create client site-specific schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Grant permissions to application user
    EXECUTE format('GRANT ALL ON SCHEMA %I TO nectar_user', schema_name);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA %I TO nectar_user', schema_name);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO nectar_user', schema_name);
    
    RETURN client_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to drop client site schema
CREATE OR REPLACE FUNCTION drop_client_site_schema(client_site_subdomain VARCHAR)
RETURNS VOID AS $$
DECLARE
    schema_name VARCHAR;
BEGIN
    schema_name := 'client_site_' || client_site_subdomain;
    
    -- Drop client site schema with all objects
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
    
    -- Delete client site record
    DELETE FROM shared.client_sites WHERE subdomain = client_site_subdomain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_sites_subdomain ON shared.client_sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_client_sites_status ON shared.client_sites(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON shared.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON shared.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_client_site_provisioning_log_client_site_id ON shared.client_site_provisioning_log(client_site_id);
CREATE INDEX IF NOT EXISTS idx_client_site_provisioning_log_subdomain ON shared.client_site_provisioning_log(subdomain);

-- Insert default admin user (password: admin123)
INSERT INTO shared.admin_users (email, username, hashed_password, full_name, role)
VALUES ('admin@nectar.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..G', 'System Administrator', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA shared TO nectar_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA shared TO nectar_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA shared TO nectar_user;

-- Create a template schema for new client sites
CREATE SCHEMA IF NOT EXISTS client_site_template;

-- Create template tables that will be copied to each client site schema
CREATE TABLE IF NOT EXISTS client_site_template.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(63) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS client_site_template.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    company VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS client_site_template.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    price DECIMAL(15,2),
    property_type VARCHAR(50) CHECK (property_type IN ('house', 'apartment', 'condo', 'townhouse', 'land')),
    bedrooms INTEGER,
    bathrooms INTEGER,
    square_feet INTEGER,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'rented', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Grant permissions on template schema
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA client_site_template TO nectar_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA client_site_template TO nectar_user;