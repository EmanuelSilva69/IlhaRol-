"""RF01a, RF01b, RNF03 — cadastro, login JWT e perfil."""

from conftest import register_and_login


async def test_register_returns_201_without_password(client):
    resp = await client.post(
        "/api/auth/register",
        json={
            "nome": "Ana",
            "email": "ana@ilharole.com",
            "senha": "SenhaForte123",
            "bairro": "Centro",
        },
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "ana@ilharole.com"
    assert body["nome"] == "Ana"
    assert body["bairro"] == "Centro"
    assert "id" in body
    assert "senha" not in body
    assert "hash_senha" not in body


async def test_register_duplicate_email_returns_409(client):
    payload = {"nome": "Ana", "email": "ana@ilharole.com", "senha": "SenhaForte123"}
    assert (await client.post("/api/auth/register", json=payload)).status_code == 201

    resp = await client.post("/api/auth/register", json=payload)

    assert resp.status_code == 409
    assert "detail" in resp.json()


async def test_register_invalid_payload_returns_422(client):
    resp = await client.post(
        "/api/auth/register",
        json={"nome": "Ana", "email": "nao-e-email", "senha": "123"},
    )

    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body
    assert "errors" in body


async def test_password_is_stored_as_argon2_hash(client, session_factory):
    from sqlalchemy import select

    from app.models import Usuario

    await register_and_login(client)

    async with session_factory() as session:
        user = (
            await session.execute(select(Usuario).where(Usuario.email == "ana@ilharole.com"))
        ).scalar_one()

    assert user.hash_senha != "SenhaForte123"
    assert user.hash_senha.startswith("$argon2")


async def test_login_returns_bearer_token(client):
    await client.post(
        "/api/auth/register",
        json={"nome": "Ana", "email": "ana@ilharole.com", "senha": "SenhaForte123"},
    )

    resp = await client.post(
        "/api/auth/login", json={"email": "ana@ilharole.com", "senha": "SenhaForte123"}
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"].count(".") == 2  # formato JWT


async def test_login_wrong_password_returns_401(client):
    await client.post(
        "/api/auth/register",
        json={"nome": "Ana", "email": "ana@ilharole.com", "senha": "SenhaForte123"},
    )

    resp = await client.post(
        "/api/auth/login", json={"email": "ana@ilharole.com", "senha": "errada123"}
    )

    assert resp.status_code == 401


async def test_login_unknown_email_returns_401(client):
    resp = await client.post(
        "/api/auth/login", json={"email": "ninguem@ilharole.com", "senha": "qualquer123"}
    )

    assert resp.status_code == 401


async def test_me_requires_token(client):
    assert (await client.get("/api/usuarios/me")).status_code == 401


async def test_me_rejects_invalid_token(client):
    resp = await client.get(
        "/api/usuarios/me", headers={"Authorization": "Bearer token.invalido.aqui"}
    )

    assert resp.status_code == 401


async def test_me_returns_profile(client, auth_headers):
    resp = await client.get("/api/usuarios/me", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "ana@ilharole.com"
    assert body["nome"] == "Ana"
    assert "preferencias" in body


async def test_update_me_changes_profile_and_preferences(client, auth_headers):
    resp = await client.put(
        "/api/usuarios/me",
        headers=auth_headers,
        json={
            "nome": "Ana Clara",
            "bairro": "São Francisco",
            "preferencias": {"receber_email": False, "lembrete_horas_antes": 2},
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["nome"] == "Ana Clara"
    assert body["bairro"] == "São Francisco"
    assert body["preferencias"]["receber_email"] is False
    assert body["preferencias"]["lembrete_horas_antes"] == 2

    again = (await client.get("/api/usuarios/me", headers=auth_headers)).json()
    assert again["nome"] == "Ana Clara"
    assert again["preferencias"]["lembrete_horas_antes"] == 2
