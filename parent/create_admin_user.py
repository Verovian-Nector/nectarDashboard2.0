#!/usr/bin/env python3
"""
Script to create a default admin user for the parent dashboard.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import AdminUser
from main import get_password_hash
from datetime import datetime

def create_default_admin():
    """Create a default admin user if none exists."""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_admin = db.query(AdminUser).filter(AdminUser.username == "admin").first()
        if existing_admin:
            print(f"Admin user 'admin' already exists with email: {existing_admin.email}")
            return existing_admin
        
        # Create default admin user
        admin_user = AdminUser(
            email="admin@viviplatform.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            role="super_admin",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"Default admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: admin123")
        print(f"Email: admin@viviplatform.com")
        print(f"Role: super_admin")
        
        return admin_user
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    create_default_admin()