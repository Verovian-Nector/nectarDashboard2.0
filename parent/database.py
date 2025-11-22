from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
from config import settings

# Create engine with PostgreSQL-specific settings
engine = create_engine(
    settings.database_url,
    echo=True,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=300,    # Recycle connections after 5 minutes
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Create tables immediately
def create_tables():
    # Import models to ensure tables are registered
    from models import Base as ModelsBase  # Import here to avoid circular imports
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