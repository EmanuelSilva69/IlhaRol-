from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.sqlalchemy_database_url,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    connect_args={
        "timeout": settings.db_connect_timeout,
        "statement_cache_size": settings.db_statement_cache_size,
        "server_settings": {
            "application_name": settings.db_application_name,
        },
    },
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
