import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_session
from app.main import app


class FakeSession:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error

    async def execute(self, statement: object) -> None:
        if self.error is not None:
            raise self.error


async def session_connected():
    yield FakeSession()


async def session_disconnected():
    yield FakeSession(OSError("connection refused"))


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


async def request_health() -> tuple[int, dict[str, str]]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    return response.status_code, response.json()


@pytest.mark.asyncio
async def test_health_connected():
    app.dependency_overrides[get_session] = session_connected

    status_code, body = await request_health()

    assert status_code == 200
    assert body == {"status": "ok", "database": "connected"}


@pytest.mark.asyncio
async def test_health_disconnected():
    app.dependency_overrides[get_session] = session_disconnected

    status_code, body = await request_health()

    assert status_code == 503
    assert body == {"status": "degraded", "database": "disconnected"}
    assert "connection refused" not in str(body)
