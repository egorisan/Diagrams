#app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://diagrams_user:diagrams_pass@localhost:5432/diagrams_db",
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ",
    "ALTER TABLE diagrams ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE",
]

async def init_db():
    # MVP: создаем таблицы и доводим схему простыми идемпотентными ALTER
    from app import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in MIGRATIONS:
            await conn.execute(text(stmt))
