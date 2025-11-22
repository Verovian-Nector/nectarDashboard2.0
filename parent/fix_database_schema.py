import sqlite3

# Connect to the database
conn = sqlite3.connect('parent.db')
cursor = conn.cursor()

print("Current database schema analysis:")
print("=" * 50)

# Check current tenants table schema
cursor.execute("PRAGMA table_info(tenants)")
columns = cursor.fetchall()

print("Current tenants table columns:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Check if status column exists
status_exists = any(col[1] == 'status' for col in columns)
id_is_string = any(col[1] == 'id' and 'VARCHAR' in col[2].upper() for col in columns)

print(f"\nStatus column exists: {status_exists}")
print(f"ID is string type: {id_is_string}")

if not status_exists:
    print("\nAdding status column...")
    cursor.execute("ALTER TABLE tenants ADD COLUMN status VARCHAR(20) DEFAULT 'active'")
    conn.commit()
    print("✓ Status column added successfully")

# Check if we need to migrate ID from INTEGER to VARCHAR
if not id_is_string:
    print("\nMigrating ID from INTEGER to VARCHAR(36)...")
    
    # Drop existing tenants_new table if it exists
    try:
        cursor.execute("DROP TABLE tenants_new")
        conn.commit()
        print("✓ Dropped existing tenants_new table")
    except sqlite3.OperationalError:
        print("No existing tenants_new table to drop")
    
    # Create new table with correct schema
    cursor.execute("""
        CREATE TABLE tenants_new (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            subdomain VARCHAR(63) UNIQUE NOT NULL,
            api_url VARCHAR(500) NOT NULL,
            is_active BOOLEAN DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME,
            settings TEXT DEFAULT '{}',
            extra_metadata TEXT DEFAULT '{}'
        )
    """)
    
    # Copy data from old table
    cursor.execute("SELECT * FROM tenants")
    old_data = cursor.fetchall()
    
    for row in old_data:
        print(f"Processing row: {row}")
        # Handle different column counts
        if len(row) == 7:
            old_id, name, subdomain, api_url, is_active, created_at, last_seen = row
            settings = '{}'
            extra_metadata = '{}'
        elif len(row) == 9:
            old_id, name, subdomain, api_url, is_active, created_at, last_seen, settings, extra_metadata = row
        else:
            print(f"Unexpected row format with {len(row)} columns: {row}")
            continue
            
        # Generate UUID for old integer IDs
        import uuid
        new_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO tenants_new (id, name, subdomain, api_url, is_active, status, created_at, last_seen, settings, extra_metadata)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
        """, (new_id, name, subdomain, api_url, bool(is_active), created_at, last_seen, settings, extra_metadata))
    
    # Drop old table and rename new table
    cursor.execute("DROP TABLE tenants")
    cursor.execute("ALTER TABLE tenants_new RENAME TO tenants")
    
    conn.commit()
    print("✓ ID migration completed successfully")

# Verify the changes
cursor.execute("PRAGMA table_info(tenants)")
new_columns = cursor.fetchall()

print("\nUpdated tenants table schema:")
for col in new_columns:
    print(f"  {col[1]} ({col[2]})")

# Check data
print("\nCurrent data:")
cursor.execute("SELECT id, name, subdomain, status, is_active FROM tenants")
rows = cursor.fetchall()
for row in rows:
    print(f"  {row}")

conn.close()
print("\n✓ Database schema update completed!")