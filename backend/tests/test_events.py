"""RF02, RF03, RF04, RF07 — feed, detalhes e CRUD do organizador."""

import uuid

from conftest import create_event, evento_payload, future, insert_event_directly, past

# ---------------------------------------------------------------------------
# RF03 / Fluxo 1 — feed de descoberta
# ---------------------------------------------------------------------------


async def test_feed_empty_returns_200_and_empty_list(client):
    resp = await client.get("/api/eventos")

    assert resp.status_code == 200
    assert resp.json() == []


async def test_feed_lists_active_future_events_in_chronological_order(
    client, auth_headers, categorias
):
    cat = categorias["Reggae"]
    later = await create_event(
        client, auth_headers, cat, titulo="Depois", data_hora=future(10).isoformat()
    )
    sooner = await create_event(
        client, auth_headers, cat, titulo="Antes", data_hora=future(2).isoformat()
    )

    resp = await client.get("/api/eventos")

    assert resp.status_code == 200
    ids = [e["id"] for e in resp.json()]
    assert ids == [sooner["id"], later["id"]]


async def test_feed_hides_cancelled_and_past_events(
    client, auth_headers, categorias, session_factory
):
    from app.models import SituacaoEvento

    cat = categorias["Reggae"]
    ativo = await create_event(client, auth_headers, cat, titulo="Ativo")
    await insert_event_directly(
        session_factory, "ana@ilharole.com", cat, titulo="Passado", data_hora=past()
    )
    await insert_event_directly(
        session_factory,
        "ana@ilharole.com",
        cat,
        titulo="Cancelado",
        data_hora=future(),
        situacao=SituacaoEvento.CANCELADO,
    )

    titles = [e["titulo"] for e in (await client.get("/api/eventos")).json()]

    assert titles == [ativo["titulo"]]


async def test_feed_text_search_is_case_insensitive_on_title_and_description(
    client, auth_headers, categorias
):
    cat = categorias["Reggae"]
    await create_event(client, auth_headers, cat, titulo="Festival de Reggae")
    await create_event(
        client, auth_headers, cat, titulo="Show na praça", descricao="Muito REGGAE roots"
    )
    await create_event(client, auth_headers, cat, titulo="Bumba meu boi", descricao="")

    resp = await client.get("/api/eventos", params={"q": "reggae"})

    assert resp.status_code == 200
    assert sorted(e["titulo"] for e in resp.json()) == [
        "Festival de Reggae",
        "Show na praça",
    ]


async def test_feed_filters_by_bairro(client, auth_headers, categorias):
    cat = categorias["Reggae"]
    await create_event(client, auth_headers, cat, titulo="No Centro", bairro="Centro")
    await create_event(client, auth_headers, cat, titulo="Na Praia", bairro="Praia Grande")

    resp = await client.get("/api/eventos", params={"bairro": "centro"})

    assert [e["titulo"] for e in resp.json()] == ["No Centro"]


async def test_feed_filters_by_categoria_name(client, auth_headers, categorias):
    await create_event(client, auth_headers, categorias["Reggae"], titulo="Reggae")
    await create_event(client, auth_headers, categorias["Teatro"], titulo="Peça")

    resp = await client.get("/api/eventos", params={"categoria": "teatro"})

    body = resp.json()
    assert [e["titulo"] for e in body] == ["Peça"]
    assert body[0]["categoria"]["nome"] == "Teatro"


async def test_feed_filters_by_periodo(client, auth_headers, categorias):
    cat = categorias["Reggae"]
    await create_event(
        client, auth_headers, cat, titulo="Em 3 dias", data_hora=future(3).isoformat()
    )
    await create_event(
        client, auth_headers, cat, titulo="Em 20 dias", data_hora=future(20).isoformat()
    )
    await create_event(
        client, auth_headers, cat, titulo="Em 60 dias", data_hora=future(60).isoformat()
    )

    semana = (await client.get("/api/eventos", params={"periodo": "semana"})).json()
    mes = (await client.get("/api/eventos", params={"periodo": "mes"})).json()

    assert [e["titulo"] for e in semana] == ["Em 3 dias"]
    assert [e["titulo"] for e in mes] == ["Em 3 dias", "Em 20 dias"]


async def test_feed_invalid_periodo_returns_422(client):
    resp = await client.get("/api/eventos", params={"periodo": "seculo"})

    assert resp.status_code == 422


async def test_feed_no_match_returns_empty_list(client, auth_headers, categorias):
    await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.get("/api/eventos", params={"q": "inexistente-xyz"})

    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# RF04 / Fluxo 2 — detalhes
# ---------------------------------------------------------------------------


async def test_event_details_include_organizer_coordinates_and_status(
    client, auth_headers, categorias
):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.get(f"/api/eventos/{created['id']}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == created["id"]
    assert body["titulo"] == "Noite do Reggae na Praia Grande"
    assert body["organizador"]["nome"] == "Ana"
    assert body["latitude"] == -2.5297
    assert body["longitude"] == -44.3028
    assert body["situacao"] == "ATIVO"
    assert body["categoria"]["nome"] == "Reggae"
    assert body["local"] == "Praça Nauro Machado"


async def test_event_details_not_found_returns_standard_404(client):
    resp = await client.get(f"/api/eventos/{uuid.uuid4()}")

    assert resp.status_code == 404
    assert resp.json() == {"detail": "Ops! Evento não encontrado"}


async def test_event_details_invalid_uuid_returns_422(client):
    resp = await client.get("/api/eventos/nao-e-uuid")

    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# RF02 — cadastro de evento
# ---------------------------------------------------------------------------


async def test_create_event_requires_authentication(client, categorias):
    resp = await client.post("/api/eventos", json=evento_payload(categorias["Reggae"]))

    assert resp.status_code == 401


async def test_create_event_sets_creator_and_active_status(
    client, auth_headers, categorias
):
    resp = await client.post(
        "/api/eventos", json=evento_payload(categorias["Reggae"]), headers=auth_headers
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["situacao"] == "ATIVO"
    assert body["organizador"]["nome"] == "Ana"


async def test_create_event_in_the_past_returns_422(client, auth_headers, categorias):
    resp = await client.post(
        "/api/eventos",
        json=evento_payload(categorias["Reggae"], data_hora=past(1).isoformat()),
        headers=auth_headers,
    )

    assert resp.status_code == 422


async def test_create_event_unknown_category_returns_404(client, auth_headers, categorias):
    resp = await client.post(
        "/api/eventos",
        json=evento_payload(str(uuid.uuid4())),
        headers=auth_headers,
    )

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# RF07 — edição e cancelamento pelo criador
# ---------------------------------------------------------------------------


async def test_update_event_by_creator(client, auth_headers, categorias):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.put(
        f"/api/eventos/{created['id']}",
        json={"titulo": "Título novo", "local": "Outro lugar"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["titulo"] == "Título novo"
    assert resp.json()["local"] == "Outro lugar"


async def test_update_event_by_other_user_returns_403(
    client, auth_headers, other_headers, categorias
):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.put(
        f"/api/eventos/{created['id']}",
        json={"titulo": "Invasão"},
        headers=other_headers,
    )

    assert resp.status_code == 403


async def test_update_event_to_past_date_returns_422(client, auth_headers, categorias):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.put(
        f"/api/eventos/{created['id']}",
        json={"data_hora": past(1).isoformat()},
        headers=auth_headers,
    )

    assert resp.status_code == 422


async def test_cancel_event_by_creator_keeps_record(client, auth_headers, categorias):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.patch(
        f"/api/eventos/{created['id']}/cancelar", headers=auth_headers
    )

    assert resp.status_code == 200
    assert resp.json()["situacao"] == "CANCELADO"

    details = await client.get(f"/api/eventos/{created['id']}")
    assert details.status_code == 200
    assert details.json()["situacao"] == "CANCELADO"


async def test_cancel_event_by_other_user_returns_403(
    client, auth_headers, other_headers, categorias
):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.patch(
        f"/api/eventos/{created['id']}/cancelar", headers=other_headers
    )

    assert resp.status_code == 403


async def test_cancel_event_requires_authentication(client, auth_headers, categorias):
    created = await create_event(client, auth_headers, categorias["Reggae"])

    resp = await client.patch(f"/api/eventos/{created['id']}/cancelar")

    assert resp.status_code == 401


async def test_cancel_unknown_event_returns_404(client, auth_headers):
    resp = await client.patch(
        f"/api/eventos/{uuid.uuid4()}/cancelar", headers=auth_headers
    )

    assert resp.status_code == 404
