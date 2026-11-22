import uuid

import pytest
from fastapi import HTTPException

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    password_hash = hash_password("senha-segura-123")

    assert password_hash != "senha-segura-123"
    assert password_hash.startswith("$argon2")
    assert verify_password("senha-segura-123", password_hash) is True
    assert verify_password("senha-errada", password_hash) is False
    assert verify_password("senha-segura-123", None) is False


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    payload = decode_access_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"
    assert "exp" in payload


async def test_invalid_token_is_rejected_by_user_dependency():
    from app.security import _user_from_token

    class FakeSession:
        async def get(self, *args, **kwargs):
            return None

    with pytest.raises(HTTPException) as error:
        await _user_from_token("token-invalido", FakeSession())

    assert error.value.status_code == 401
