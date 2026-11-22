from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_openapi_exposes_database_backed_routes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]

    for path in [
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/me",
        "/api/eventos",
        "/api/eventos/{event_id}",
        "/api/eventos/{event_id}/favorito",
        "/api/eventos/{event_id}/avaliacoes",
        "/api/me/perfil",
        "/api/me/senha",
        "/api/me/agenda",
        "/api/me/notificacoes",
        "/api/me/denuncias",
        "/api/denuncias",
    ]:
        assert path in paths


async def test_root_identifies_new_api_version():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")

    assert response.status_code == 200
    assert response.json()["version"] == "0.2.0"
