"""RF05, RF06, RF10, RF14 — favoritos, agenda, avaliações e denúncias."""

import uuid

from conftest import create_event, future, insert_event_directly

# ---------------------------------------------------------------------------
# RF05 / Fluxo 3 — favoritos
# ---------------------------------------------------------------------------


async def test_favorite_requires_authentication(client, auth_headers, categorias):
    evento = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.post(f"/api/eventos/{evento['id']}/favoritos")

    assert resp.status_code == 401


async def test_favorite_returns_201_then_409_on_duplicate(
    client, auth_headers, categorias
):
    evento = await create_event(client, auth_headers, categorias["Reggae"])
    url = f"/api/eventos/{evento['id']}/favoritos"

    first = await client.post(url, headers=auth_headers)
    second = await client.post(url, headers=auth_headers)

    assert first.status_code == 201
    assert first.json()["evento_id"] == evento["id"]
    assert second.status_code == 409


async def test_favorite_unknown_event_returns_404(client, auth_headers):
    resp = await client.post(
        f"/api/eventos/{uuid.uuid4()}/favoritos", headers=auth_headers
    )

    assert resp.status_code == 404


async def test_unfavorite_removes_only_own_link(
    client, auth_headers, other_headers, categorias
):
    evento = await create_event(client, auth_headers, categorias["Reggae"])
    url = f"/api/eventos/{evento['id']}/favoritos"
    await client.post(url, headers=auth_headers)
    await client.post(url, headers=other_headers)

    resp = await client.delete(url, headers=auth_headers)

    assert resp.status_code == 204
    mine = (await client.get("/api/usuarios/me/agenda", headers=auth_headers)).json()
    theirs = (await client.get("/api/usuarios/me/agenda", headers=other_headers)).json()
    assert mine == []
    assert [e["id"] for e in theirs] == [evento["id"]]


async def test_unfavorite_when_not_favorited_returns_404(
    client, auth_headers, categorias
):
    evento = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.delete(
        f"/api/eventos/{evento['id']}/favoritos", headers=auth_headers
    )

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# RF10 / Fluxo 4 — agenda pessoal
# ---------------------------------------------------------------------------


async def test_agenda_requires_authentication(client):
    assert (await client.get("/api/usuarios/me/agenda")).status_code == 401


async def test_agenda_lists_favorites_in_chronological_order(
    client, auth_headers, categorias
):
    cat = categorias["Reggae"]
    later = await create_event(
        client, auth_headers, cat, titulo="Depois", data_hora=future(15).isoformat()
    )
    sooner = await create_event(
        client, auth_headers, cat, titulo="Antes", data_hora=future(1).isoformat()
    )
    await create_event(client, auth_headers, cat, titulo="Não salvo")
    # Favorita fora de ordem para garantir que a ordenação vem de data_hora.
    await client.post(f"/api/eventos/{later['id']}/favoritos", headers=auth_headers)
    await client.post(f"/api/eventos/{sooner['id']}/favoritos", headers=auth_headers)

    resp = await client.get("/api/usuarios/me/agenda", headers=auth_headers)

    assert resp.status_code == 200
    assert [e["titulo"] for e in resp.json()] == ["Antes", "Depois"]


# ---------------------------------------------------------------------------
# RF06 — avaliações pós-evento
# ---------------------------------------------------------------------------


async def test_review_past_event_returns_201(
    client, auth_headers, categorias, session_factory
):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )

    resp = await client.post(
        f"/api/eventos/{evento_id}/avaliacoes",
        json={"nota": 5, "comentario": "Espetáculo incrível"},
        headers=auth_headers,
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["nota"] == 5
    assert body["comentario"] == "Espetáculo incrível"
    assert body["autor"]["nome"] == "Ana"


async def test_review_requires_authentication(client, auth_headers, categorias, session_factory):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )

    resp = await client.post(f"/api/eventos/{evento_id}/avaliacoes", json={"nota": 4})

    assert resp.status_code == 401


async def test_review_future_event_returns_400(client, auth_headers, categorias):
    evento = await create_event(client, auth_headers, categorias["Teatro"])

    resp = await client.post(
        f"/api/eventos/{evento['id']}/avaliacoes",
        json={"nota": 4},
        headers=auth_headers,
    )

    assert resp.status_code == 400


async def test_review_cancelled_event_returns_400(
    client, auth_headers, categorias, session_factory
):
    from app.models import SituacaoEvento

    evento_id = await insert_event_directly(
        session_factory,
        "ana@ilharole.com",
        categorias["Teatro"],
        situacao=SituacaoEvento.CANCELADO,
    )

    resp = await client.post(
        f"/api/eventos/{evento_id}/avaliacoes", json={"nota": 3}, headers=auth_headers
    )

    assert resp.status_code == 400


async def test_review_duplicate_returns_409(
    client, auth_headers, categorias, session_factory
):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )
    url = f"/api/eventos/{evento_id}/avaliacoes"

    assert (await client.post(url, json={"nota": 4}, headers=auth_headers)).status_code == 201
    resp = await client.post(url, json={"nota": 2}, headers=auth_headers)

    assert resp.status_code == 409


async def test_review_nota_out_of_range_returns_422(
    client, auth_headers, categorias, session_factory
):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )
    url = f"/api/eventos/{evento_id}/avaliacoes"

    for nota in (0, 6, 3.5):
        resp = await client.post(url, json={"nota": nota}, headers=auth_headers)
        assert resp.status_code == 422, nota


async def test_review_unknown_event_returns_404(client, auth_headers):
    resp = await client.post(
        f"/api/eventos/{uuid.uuid4()}/avaliacoes", json={"nota": 4}, headers=auth_headers
    )

    assert resp.status_code == 404


async def test_list_reviews_of_event(
    client, auth_headers, other_headers, categorias, session_factory
):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )
    url = f"/api/eventos/{evento_id}/avaliacoes"
    await client.post(url, json={"nota": 5, "comentario": "Top"}, headers=auth_headers)
    await client.post(url, json={"nota": 3}, headers=other_headers)

    resp = await client.get(url)

    assert resp.status_code == 200
    assert sorted(r["nota"] for r in resp.json()) == [3, 5]


# ---------------------------------------------------------------------------
# RF14 — denúncias
# ---------------------------------------------------------------------------


async def test_report_event_returns_201_and_keeps_content(
    client, auth_headers, other_headers, categorias
):
    evento = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.post(
        "/api/denuncias",
        json={"evento_id": evento["id"], "motivo": "Informação falsa"},
        headers=other_headers,
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["situacao"] == "PENDENTE"
    assert body["evento_id"] == evento["id"]
    assert "denunciante_id" not in body
    assert "denunciante" not in body
    # O conteúdo denunciado não é removido automaticamente.
    assert (await client.get(f"/api/eventos/{evento['id']}")).status_code == 200


async def test_report_review_returns_201(
    client, auth_headers, other_headers, categorias, session_factory
):
    evento_id = await insert_event_directly(
        session_factory, "ana@ilharole.com", categorias["Teatro"]
    )
    review = await client.post(
        f"/api/eventos/{evento_id}/avaliacoes",
        json={"nota": 1, "comentario": "ofensivo"},
        headers=auth_headers,
    )

    resp = await client.post(
        "/api/denuncias",
        json={"avaliacao_id": review.json()["id"], "motivo": "Conteúdo ofensivo"},
        headers=other_headers,
    )

    assert resp.status_code == 201
    assert resp.json()["avaliacao_id"] == review.json()["id"]
    assert len((await client.get(f"/api/eventos/{evento_id}/avaliacoes")).json()) == 1


async def test_report_requires_authentication(client, auth_headers, categorias):
    evento = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.post(
        "/api/denuncias", json={"evento_id": evento["id"], "motivo": "Spam"}
    )

    assert resp.status_code == 401


async def test_report_requires_exactly_one_target(client, auth_headers):
    none = await client.post(
        "/api/denuncias", json={"motivo": "Spam"}, headers=auth_headers
    )
    both = await client.post(
        "/api/denuncias",
        json={
            "evento_id": str(uuid.uuid4()),
            "avaliacao_id": str(uuid.uuid4()),
            "motivo": "Spam",
        },
        headers=auth_headers,
    )

    assert none.status_code == 422
    assert both.status_code == 422


async def test_report_unknown_target_returns_404(client, auth_headers):
    resp = await client.post(
        "/api/denuncias",
        json={"evento_id": str(uuid.uuid4()), "motivo": "Spam"},
        headers=auth_headers,
    )

    assert resp.status_code == 404
