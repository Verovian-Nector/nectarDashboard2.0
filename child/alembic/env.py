from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from database import Base
from database import DBUser, DBProperty, Inventory, Room, Item, DefaultRoom, DefaultItem
from config import settings
import re
# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    # ✅ Use DATABASE_URL from settings, converted to sync driver for Alembic
    url = settings.DATABASE_URL
    # Convert async drivers to sync equivalents where needed
    if url.startswith("postgresql+asyncpg"):
        url = url.replace("+asyncpg", "+psycopg2")
    elif url.startswith("sqlite+aiosqlite"):
        url = url.replace("+aiosqlite", "")  # use default sqlite driver

    # Override sqlalchemy.url with the computed sync URL
    config.set_main_option("sqlalchemy.url", url)

    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,  # Optional: detect column type changes
            render_as_batch=True  # Optional: better for SQLite/PostgreSQL
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
