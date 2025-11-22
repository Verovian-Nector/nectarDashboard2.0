import sqlite3

def check_client_site_db():
    conn = sqlite3.connect('client_site_nam.db')
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
    tables = cursor.fetchall()
    print('Tables in client_site_nam.db:', [t[0] for t in tables])
    
    # Check users if table exists
    if 'users' in [t[0] for t in tables]:
        cursor.execute('SELECT id, email, role, client_site_id FROM users LIMIT 10;')
        results = cursor.fetchall()
        print('\nUsers in client_site_nam database:')
        for row in results:
            print(f'ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Client Site ID: {row[3]}')
    
    conn.close()

if __name__ == "__main__":
    check_client_site_db()