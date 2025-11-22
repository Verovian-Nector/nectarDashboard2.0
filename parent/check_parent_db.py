import sqlite3

def check_parent_db():
    conn = sqlite3.connect('parent.db')
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
    tables = cursor.fetchall()
    print('Tables in parent.db:', [t[0] for t in tables])
    
    # Check users if table exists
    if 'users' in [t[0] for t in tables]:
        cursor.execute('SELECT id, email, role, client_site_id FROM users LIMIT 10;')
        results = cursor.fetchall()
        print('\nUsers in parent database:')
        for row in results:
            print(f'ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Client Site ID: {row[3]}')
    
    # Check client sites if table exists
    if 'client_sites' in [t[0] for t in tables]:
        cursor.execute('PRAGMA table_info(client_sites);')
        columns = cursor.fetchall()
        print('\nClient Sites table columns:', [c[1] for c in columns])
        
        cursor.execute('SELECT * FROM client_sites LIMIT 10;')
        tenant_results = cursor.fetchall()
        print('\nClient Sites in parent database:')
        for row in tenant_results:
            print(f'Row: {row}')
    
    conn.close()

if __name__ == "__main__":
    check_parent_db()