import sqlite3
import json

def check_database_data():
    conn = sqlite3.connect('child/child.db')
    cursor = conn.cursor()
    
    # Check clients
    print("=== CLIENTS ===")
    cursor.execute("SELECT id, name, subdomain FROM clients")
    clients = cursor.fetchall()
    for client in clients:
        print(f"ID: {client[0]}, Name: {client[1]}, Subdomain: {client[2]}")
    
    # Check properties
    print("\n=== PROPERTIES ===")
    cursor.execute("SELECT id, title, client_site_id, published FROM properties LIMIT 10")
    properties = cursor.fetchall()
    for prop in properties:
        print(f"ID: {prop[0]}, Title: {prop[1]}, Client Site: {prop[2]}, Published: {prop[3]}")
    
    # Check tenants
    print("\n=== TENANTS ===")
    cursor.execute("SELECT id, name, client_site_id FROM tenants LIMIT 10")
    tenants = cursor.fetchall()
    for tenant in tenants:
        print(f"ID: {tenant[0]}, Name: {tenant[1]}, Client Site: {tenant[2]}")
    
    # Check payments
    print("\n=== PAYMENTS ===")
    cursor.execute("SELECT id, amount, property_id FROM payments LIMIT 10")
    payments = cursor.fetchall()
    for payment in payments:
        print(f"ID: {payment[0]}, Amount: {payment[1]}, Property ID: {payment[2]}")
    
    conn.close()

if __name__ == "__main__":
    check_database_data()