from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

# Use file-based SQLite database for MVP
SQLALCHEMY_DATABASE_URL = "sqlite:///./parent.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Create tables immediately
def create_tables():
    # Import models to ensure tables are registered
    from models import Tenant, Base as ModelsBase  # Import here to avoid circular imports
    # Create tables for the models' Base (not the local Base)
    ModelsBase.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables on module import
create_tables()