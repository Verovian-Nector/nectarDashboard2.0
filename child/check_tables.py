import sqlite3

# Connect to the database
conn = sqlite3.connect('child.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print('Existing tables:')
for table in tables:
    print(f'  - {table[0]}')

# Check if properties table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='properties';")
properties_table = cursor.fetchone()

if properties_table:
    print("\nProperties table exists!")
    # Get column info
    cursor.execute("PRAGMA table_info(properties);")
    columns = cursor.fetchall()
    print("Columns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
else:
    print("\nProperties table does NOT exist!")

conn.close()