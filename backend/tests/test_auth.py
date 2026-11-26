from sqlalchemy import select

from conftest import bearer, register


async def test_register_returns_201_with_token_and_profile(client):
    body = await register(client, neighborhood="Centro", interests=["reggae"])

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    user = body["user"]
    assert user["email"] == "ana@ilharole.com"
    assert user["name"] == "Ana"
    assert user["role"] == "visitor"
    assert user["neighborhood"] == "Centro"
    assert user["interests"] == ["Música/Reggae"]
    assert "password" not in user
    assert "password_hash" not in user


async def test_register_duplicate_email_is_case_insensitive_409(client):
    await register(client)

    resp = await client.post(
        "/api/auth/register",
        json={"name": "Outra", "email": "ANA@ilharole.com", "password": "SenhaForte123"},
    )

    assert resp.status_code == 409
    assert resp.json() == {"detail": "E-mail já cadastrado"}


async def test_register_invalid_payload_returns_422(client):
    resp = await client.post(
        "/api/auth/register",
        json={"name": "Ana", "email": "nao-e-email", "password": "123"},
    )

    assert resp.status_code == 422
    body = resp.json()
    assert body["detail"] == "Dados inválidos"
    assert {e["campo"] for e in body["errors"]} == {"email", "password"}


async def test_register_cannot_self_assign_admin(client):
    resp = await client.post(
        "/api/auth/register",
        json={
            "name": "Ana",
            "email": "ana@ilharole.com",
            "password": "SenhaForte123",
            "role": "admin",
        },
    )

    assert resp.status_code == 422


async def test_password_is_stored_as_argon2_hash(client, session_factory):
    from app.models import User

    await register(client)

    async with session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "ana@ilharole.com"))

    assert user.password_hash.startswith("$argon2")
    assert "SenhaForte123" not in user.password_hash


async def test_login_returns_bearer_token(client):
    await register(client)

    resp = await client.post(
        "/api/auth/login",
        json={"email": "ana@ilharole.com", "password": "SenhaForte123"},
    )

    assert resp.status_code == 200
    assert resp.json()["access_token"]
    assert resp.json()["user"]["email"] == "ana@ilharole.com"


async def test_login_wrong_password_returns_401(client):
    await register(client)

    resp = await client.post(
        "/api/auth/login",
        json={"email": "ana@ilharole.com", "password": "senha-errada"},
    )

    assert resp.status_code == 401
    assert resp.json() == {"detail": "Credenciais inválidas"}


async def test_login_unknown_email_returns_same_401(client):
    resp = await client.post(
        "/api/auth/login",
        json={"email": "ninguem@ilharole.com", "password": "SenhaForte123"},
    )

    assert resp.status_code == 401
    assert resp.json() == {"detail": "Credenciais inválidas"}


async def test_me_requires_token(client):
    resp = await client.get("/api/auth/me")

    assert resp.status_code == 401
    assert resp.headers["www-authenticate"] == "Bearer"


async def test_me_rejects_invalid_token(client):
    resp = await client.get(
        "/api/auth/me", headers={"Authorization": "Bearer token-invalido"}
    )

    assert resp.status_code == 401


async def test_me_returns_profile(client):
    headers = bearer(await register(client))

    resp = await client.get("/api/auth/me", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["email"] == "ana@ilharole.com"


async def test_update_profile_and_preferences(client):
    headers = bearer(await register(client))

    profile = await client.patch(
        "/api/me/perfil",
        json={"name": "Ana Maria", "neighborhood": "Renascença", "interests": ["teatro"]},
        headers=headers,
    )
    prefs = await client.put(
        "/api/me/preferencias", json={"weekly_summary": True}, headers=headers
    )

    assert profile.status_code == 200
    assert profile.json()["name"] == "Ana Maria"
    assert profile.json()["neighborhood"] == "Renascença"
    assert profile.json()["interests"] == ["Teatro"]
    assert prefs.status_code == 200
    assert prefs.json() == {
        "new_events": True,
        "event_changes": True,
        "weekly_summary": True,
    }


async def test_change_password_requires_current_password(client):
    headers = bearer(await register(client))

    wrong = await client.post(
        "/api/me/senha",
        json={"current_password": "errada", "new_password": "NovaSenha123"},
        headers=headers,
    )
    ok = await client.post(
        "/api/me/senha",
        json={"current_password": "SenhaForte123", "new_password": "NovaSenha123"},
        headers=headers,
    )
    login = await client.post(
        "/api/auth/login",
        json={"email": "ana@ilharole.com", "password": "NovaSenha123"},
    )

    assert wrong.status_code == 400
    assert ok.status_code == 200
    assert login.status_code == 200


async def test_deleted_account_cannot_login_nor_use_token(client):
    headers = bearer(await register(client))

    deleted = await client.delete("/api/auth/account", headers=headers)
    login = await client.post(
        "/api/auth/login",
        json={"email": "ana@ilharole.com", "password": "SenhaForte123"},
    )
    me = await client.get("/api/auth/me", headers=headers)

    assert deleted.status_code == 200
    assert login.status_code == 401
    assert me.status_code == 401
