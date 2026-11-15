import os

# A configuração é obrigatória; os testes não acessam o banco real.
os.environ.setdefault("POSTGRES_DB", "ilharole_test")
os.environ.setdefault("POSTGRES_USER", "ilharole_test")
os.environ.setdefault("POSTGRES_PASSWORD", "test-password")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-com-pelo-menos-32-bytes!!")

from collections.abc import AsyncIterator  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from typing import Any  # noqa: E402

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool  # noqa: E402


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    """Banco SQLite em memória, recriado a cada teste."""
    from app.models import Base

    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_sessionmaker(engine, expire_on_commit=False)

    await engine.dispose()


@pytest.fixture
async def client(session_factory) -> AsyncIterator[AsyncClient]:
    """Cliente HTTP com a sessão do banco apontando para o SQLite de teste."""
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


# ---------------------------------------------------------------------------
# Helpers de dados
# ---------------------------------------------------------------------------


def future(days: int = 7) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def past(days: int = 7) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


@pytest.fixture
async def categorias(session_factory) -> dict[str, str]:
    """Cria categorias e devolve {nome: id}."""
    from app.models import Categoria

    nomes = ["Reggae", "Teatro", "Gastronomia"]
    async with session_factory() as session:
        objs = [Categoria(nome=n, descricao=f"Eventos de {n}") for n in nomes]
        session.add_all(objs)
        await session.commit()
        return {c.nome: str(c.id) for c in objs}


async def register_and_login(
    client: AsyncClient,
    email: str = "ana@ilharole.com",
    senha: str = "SenhaForte123",
    nome: str = "Ana",
) -> dict[str, str]:
    resp = await client.post(
        "/api/auth/register",
        json={"nome": nome, "email": email, "senha": senha, "bairro": "Centro"},
    )
    assert resp.status_code == 201, resp.text
    resp = await client.post("/api/auth/login", json={"email": email, "senha": senha})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
async def auth_headers(client) -> dict[str, str]:
    return await register_and_login(client)


@pytest.fixture
async def other_headers(client) -> dict[str, str]:
    return await register_and_login(client, email="beto@ilharole.com", nome="Beto")


def evento_payload(categoria_id: str, **overrides: Any) -> dict[str, Any]:
    data = {
        "titulo": "Noite do Reggae na Praia Grande",
        "descricao": "Radiola de reggae com DJs locais",
        "data_hora": future().isoformat(),
        "local": "Praça Nauro Machado",
        "bairro": "Praia Grande",
        "latitude": -2.5297,
        "longitude": -44.3028,
        "imagem_url": "https://example.com/reggae.jpg",
        "categoria_id": categoria_id,
    }
    data.update(overrides)
    return data


async def create_event(
    client: AsyncClient, headers: dict[str, str], categoria_id: str, **overrides: Any
) -> dict[str, Any]:
    resp = await client.post(
        "/api/eventos", json=evento_payload(categoria_id, **overrides), headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def insert_event_directly(
    session_factory, criador_email: str, categoria_id: str, **fields: Any
) -> str:
    """Insere evento direto no banco (ex.: eventos passados, que a API bloqueia)."""
    import uuid

    from sqlalchemy import select

    from app.models import Evento, Usuario

    async with session_factory() as session:
        criador = (
            await session.execute(select(Usuario).where(Usuario.email == criador_email))
        ).scalar_one()
        data = {
            "titulo": "Evento direto",
            "descricao": "Inserido pelo teste",
            "data_hora": past(),
            "local": "Teatro Arthur Azevedo",
            "bairro": "Centro",
            "latitude": -2.53,
            "longitude": -44.30,
        }
        data.update(fields)
        evento = Evento(
            criador_id=criador.id, categoria_id=uuid.UUID(categoria_id), **data
        )
        session.add(evento)
        await session.commit()
        return str(evento.id)
