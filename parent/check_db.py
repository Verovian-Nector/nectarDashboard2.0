import sqlite3

# Connect to the database
conn = sqlite3.connect('parent.db')
cursor = conn.cursor()

# Check if client_sites table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='client_sites'")
table_exists = cursor.fetchone()

if table_exists:
    print("Client Sites table exists")
    
    # Get table schema
    cursor.execute("PRAGMA table_info(client_sites)")
    columns = cursor.fetchall()
    
    print("\nCurrent client_sites table schema:")
    print("Column ID | Name | Type | Not Null | Default | Primary Key")
    print("-" * 60)
    for col in columns:
        print(f"{col[0]:9} | {col[1]:12} | {col[2]:10} | {col[3]:8} | {str(col[4]):7} | {col[5]}")
    
    # Check if status column exists
    status_column_exists = any(col[1] == 'status' for col in columns)
    print(f"\nStatus column exists: {status_column_exists}")
    
    # Show sample data
    cursor.execute("SELECT * FROM client_sites LIMIT 3")
    rows = cursor.fetchall()
    if rows:
        print(f"\nSample data ({len(rows)} rows):")
        for row in rows:
            print(row)
    else:
        print("\nNo data in client_sites table")
else:
    print("Client Sites table does not exist")

conn.close()