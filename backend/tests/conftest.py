import os

# A configuração é obrigatória; a API nunca usa o banco de desenvolvimento nos testes.
os.environ.setdefault("POSTGRES_DB", "ilharole_test")
os.environ.setdefault("POSTGRES_USER", "ilharole_test")
os.environ.setdefault("POSTGRES_PASSWORD", "test-password")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")

import asyncio  # noqa: E402
from collections.abc import AsyncIterator  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from pathlib import Path  # noqa: E402
from typing import Any  # noqa: E402
from urllib.parse import urlsplit, urlunsplit  # noqa: E402

import asyncpg  # noqa: E402
import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool  # noqa: E402

DB_DIR = Path(
    os.getenv("ILHAROLE_DB_DIR", Path(__file__).resolve().parents[2] / "devops" / "db")
)
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

CATEGORIES = [
    ("reggae", "Música/Reggae"),
    ("teatro", "Teatro"),
    ("gastronomia", "Gastronomia"),
]


def _asyncpg_url(url: str, database: str | None = None) -> str:
    parts = urlsplit(url.replace("postgresql+asyncpg://", "postgresql://", 1))
    if database is not None:
        parts = parts._replace(path=f"/{database}")
    return urlunsplit(parts)


def _sqlalchemy_url(url: str) -> str:
    return _asyncpg_url(url).replace("postgresql://", "postgresql+asyncpg://", 1)


async def _prepare_database(url: str) -> None:
    """Recria o banco de teste e aplica init + migrações do devops."""
    database = urlsplit(url).path.lstrip("/")

    admin = await asyncpg.connect(_asyncpg_url(url, "postgres"))
    try:
        exists = await admin.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", database
        )
        if not exists:
            await admin.execute(f'CREATE DATABASE "{database}"')
    finally:
        await admin.close()

    conn = await asyncpg.connect(_asyncpg_url(url))
    try:
        await conn.execute(
            "DROP SCHEMA IF EXISTS analytics, audit, app CASCADE"
        )
        await conn.execute((DB_DIR / "init" / "01-init.sql").read_text())
        for migration in sorted((DB_DIR / "migrations").glob("*.sql")):
            await conn.execute(migration.read_text())
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def database_url() -> str:
    if not TEST_DATABASE_URL:
        pytest.skip("defina TEST_DATABASE_URL para rodar os testes de integração")

    database = urlsplit(TEST_DATABASE_URL).path.lstrip("/")
    if not database.endswith("_test"):
        pytest.exit(
            "TEST_DATABASE_URL deve apontar para um banco terminado em '_test'",
            returncode=2,
        )
    if not (DB_DIR / "migrations").is_dir():
        pytest.exit(
            f"migrações não encontradas em {DB_DIR}; defina ILHAROLE_DB_DIR",
            returncode=2,
        )

    asyncio.run(_prepare_database(TEST_DATABASE_URL))
    return _sqlalchemy_url(TEST_DATABASE_URL)


@pytest.fixture
async def session_factory(database_url) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    """Banco limpo a cada teste, com as categorias básicas cadastradas."""
    from app.models import Category

    engine = create_async_engine(database_url, poolclass=NullPool)
    async with engine.begin() as conn:
        tables = (
            await conn.execute(
                text(
                    "SELECT format('%I.%I', schemaname, tablename) FROM pg_tables "
                    "WHERE schemaname IN ('app', 'audit') "
                    "AND tablename <> 'schema_migrations'"
                )
            )
        ).scalars().all()
        await conn.execute(text(f"TRUNCATE {', '.join(tables)} CASCADE"))

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        session.add_all(
            Category(slug=slug, name=name, sort_order=index)
            for index, (slug, name) in enumerate(CATEGORIES)
        )
        await session.commit()

    yield factory

    await engine.dispose()


@pytest.fixture
async def client(session_factory) -> AsyncIterator[AsyncClient]:
    from app.db import get_session
    from app.main import app

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


def future(days: int = 7, hours: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days, hours=hours)


def past(days: int = 7) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def register(
    client: AsyncClient,
    email: str = "ana@ilharole.com",
    name: str = "Ana",
    role: str = "visitor",
    **extra: Any,
) -> dict[str, Any]:
    resp = await client.post(
        "/api/auth/register",
        json={
            "name": name,
            "email": email,
            "password": "SenhaForte123",
            "role": role,
            **extra,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def bearer(token_response: dict[str, Any]) -> dict[str, str]:
    return {"Authorization": f"Bearer {token_response['access_token']}"}


@pytest.fixture
async def producer(client) -> dict[str, str]:
    return bearer(await register(client, "produtora@ilharole.com", "Produtora", "producer"))


@pytest.fixture
async def visitor(client) -> dict[str, str]:
    return bearer(await register(client, "beto@ilharole.com", "Beto"))


def event_payload(**overrides: Any) -> dict[str, Any]:
    starts_at = overrides.pop("starts_at", future())
    data = {
        "title": "Noite do Reggae na Praia Grande",
        "description": "Radiola de reggae com DJs locais",
        "category": "reggae",
        "starts_at": starts_at.isoformat(),
        "ends_at": (starts_at + timedelta(hours=4)).isoformat(),
        "venue_name": "Praça Nauro Machado",
        "neighborhood": "Praia Grande",
        "latitude": -2.5297,
        "longitude": -44.3028,
    }
    data.update(overrides)
    return data


async def create_event(
    client: AsyncClient, headers: dict[str, str], **overrides: Any
) -> dict[str, Any]:
    resp = await client.post(
        "/api/eventos", json=event_payload(**overrides), headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def insert_event(
    session_factory,
    organizer_email: str,
    starts_at: datetime,
    status: str = "published",
    title: str = "Evento inserido",
) -> str:
    """Insere evento direto no banco (ex.: eventos passados, que a API bloqueia)."""
    from sqlalchemy import select

    from app.models import Category, Event, EventCategory, User
    from app.slugs import event_slug

    async with session_factory() as session:
        organizer = await session.scalar(select(User).where(User.email == organizer_email))
        category = await session.scalar(select(Category).where(Category.slug == "teatro"))
        event = Event(
            slug=event_slug(title),
            title=title,
            organizer_id=organizer.id,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(hours=2),
            status=status,
        )
        session.add(event)
        await session.flush()
        session.add(EventCategory(event_id=event.id, category_id=category.id, is_primary=True))
        await session.commit()
        return str(event.id)
