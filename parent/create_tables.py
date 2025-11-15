from sqlalchemy import create_engine
from models import Base, Tenant
from datetime import datetime

# Create engine and tables
engine = create_engine('sqlite:///./parent.db', echo=True)
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")