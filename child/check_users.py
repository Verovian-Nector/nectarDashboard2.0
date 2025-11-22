import sqlite3

def check_child_users():
    conn = sqlite3.connect('child_dashboard.db')
    cursor = conn.cursor()
    
    # Check all users
    cursor.execute('SELECT id, email, role, tenant_id FROM users LIMIT 20;')
    results = cursor.fetchall()
    print('All users in child database:')
    for row in results:
        print(f'ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Tenant ID: {row[3]}')
    
    print('\n' + '='*50 + '\n')
    
    # Check admin users specifically
    cursor.execute('SELECT id, email, role, tenant_id FROM users WHERE role LIKE ?', ['%admin%'])
    admin_results = cursor.fetchall()
    print('Admin users in child database:')
    for row in admin_results:
        print(f'ID: {row[0]}, Email: {row[1]}, Role: {row[2]}, Tenant ID: {row[3]}')
    
    conn.close()

if __name__ == "__main__":
    check_child_users()