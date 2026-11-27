import uuid
from datetime import datetime, timedelta, timezone

from conftest import (
    bearer,
    create_event,
    event_payload,
    future,
    insert_event,
    past,
    register,
)


async def _titles(client, **params) -> list[str]:
    resp = await client.get("/api/eventos", params=params)
    assert resp.status_code == 200, resp.text
    return [event["title"] for event in resp.json()]


# Feed


async def test_feed_empty_returns_empty_list(client):
    assert await _titles(client) == []


async def test_feed_is_chronological(client, producer):
    await create_event(client, producer, title="Depois", starts_at=future(10))
    await create_event(client, producer, title="Antes", starts_at=future(2))

    assert await _titles(client) == ["Antes", "Depois"]


async def test_feed_hides_drafts(client, producer, session_factory):
    await create_event(client, producer, title="Publicado")
    await insert_event(
        session_factory, "produtora@ilharole.com", future(), status="draft", title="Rascunho"
    )

    assert await _titles(client) == ["Publicado"]


async def test_feed_search_is_case_insensitive_on_title_and_description(
    client, producer
):
    await create_event(client, producer, title="Festival de Reggae")
    await create_event(
        client, producer, title="Show na praça", description="Muito REGGAE roots"
    )
    await create_event(client, producer, title="Bumba meu boi", description="Matracas")

    assert sorted(await _titles(client, q="reggae")) == [
        "Festival de Reggae",
        "Show na praça",
    ]


async def test_feed_search_ignores_accents(client, producer):
    await create_event(client, producer, title="Música em São Luís")
    await create_event(client, producer, title="Teatro", description="Peça clássica")

    assert await _titles(client, q="musica em sao luis") == ["Música em São Luís"]
    assert await _titles(client, q="CLASSICA") == ["Teatro"]


async def test_feed_filters_by_bairro(client, producer):
    await create_event(client, producer, title="No Centro Histórico")
    await create_event(
        client,
        producer,
        title="No Renascença",
        venue_name="Lagoa da Jansen",
        neighborhood="Renascença",
    )

    assert await _titles(client, bairro="Renascença") == ["No Renascença"]


async def test_feed_filters_by_category_slug(client, producer):
    await create_event(client, producer, title="Reggae")
    await create_event(client, producer, title="Peça", category="teatro")

    assert await _titles(client, categoria="teatro") == ["Peça"]


async def test_feed_filters_by_periodo(client, producer, session_factory):
    await create_event(client, producer, title="Esta semana", starts_at=future(3))
    await create_event(client, producer, title="Mês que vem", starts_at=future(30))
    await insert_event(session_factory, "produtora@ilharole.com", past(), title="Passado")

    assert await _titles(client, periodo="PASSADOS") == ["Passado"]
    assert await _titles(client, periodo="PROXIMOS") == ["Esta semana", "Mês que vem"]


async def test_feed_weekend_period_uses_saturday_and_sunday(client, producer):
    from app.services.events import weekend_window

    now = datetime.now(timezone.utc)
    weekend_start, weekend_end = weekend_window(now)
    on_weekend = max(weekend_start + timedelta(hours=12), now + timedelta(minutes=5))
    await create_event(client, producer, title="No fim de semana", starts_at=on_weekend)
    await create_event(
        client, producer, title="Na quarta seguinte", starts_at=weekend_end + timedelta(days=2)
    )

    assert await _titles(client, periodo="FIM_DE_SEMANA") == ["No fim de semana"]


async def test_feed_invalid_period_returns_422(client):
    resp = await client.get("/api/eventos", params={"periodo": "AMANHA"})

    assert resp.status_code == 422
    assert resp.json()["errors"][0]["campo"] == "query.periodo"


async def test_feed_marks_favorites_for_logged_user(client, producer, visitor):
    event = await create_event(client, producer)
    await client.post(f"/api/eventos/{event['id']}/favorito", headers=visitor)

    anonymous = (await client.get("/api/eventos")).json()
    logged = (await client.get("/api/eventos", headers=visitor)).json()

    assert anonymous[0]["is_favorite"] is False
    assert logged[0]["is_favorite"] is True


# Detalhes


async def test_event_details_include_organizer_venue_and_status(client, producer):
    created = await create_event(client, producer)

    resp = await client.get(f"/api/eventos/{created['id']}")

    assert resp.status_code == 200
    body = resp.json()
    assert body["organizer"] == "Produtora"
    assert body["location"] == "Praça Nauro Machado"
    assert body["neighborhood"] == "Centro Histórico"
    assert body["latitude"] == -2.5297
    assert body["longitude"] == -44.3028
    assert body["category"] == "reggae"
    assert body["status"] == "ATIVO"
    assert body["reviews"] == []


async def test_finished_event_is_reported_as_realizado(
    client, producer, session_factory
):
    finished = await insert_event(session_factory, "produtora@ilharole.com", past())
    cancelled = await insert_event(
        session_factory, "produtora@ilharole.com", past(), status="cancelled"
    )

    finished_body = (await client.get(f"/api/eventos/{finished}")).json()
    cancelled_body = (await client.get(f"/api/eventos/{cancelled}")).json()

    assert finished_body["status"] == "REALIZADO"
    assert cancelled_body["status"] == "CANCELADO"


async def test_event_details_not_found_returns_standard_404(client):
    resp = await client.get(f"/api/eventos/{uuid.uuid4()}")

    assert resp.status_code == 404
    assert resp.json() == {"detail": "Evento não encontrado"}


async def test_event_details_invalid_uuid_returns_422(client):
    resp = await client.get("/api/eventos/nao-e-uuid")

    assert resp.status_code == 422
    assert resp.json()["detail"] == "Dados inválidos"
    assert resp.json()["errors"][0]["campo"] == "path.event_id"


# Criação


async def test_create_event_requires_authentication(client):
    resp = await client.post("/api/eventos", json=event_payload())

    assert resp.status_code == 401


async def test_create_event_requires_producer_role(client, visitor):
    resp = await client.post("/api/eventos", json=event_payload(), headers=visitor)

    assert resp.status_code == 403


async def test_create_event_sets_organizer_and_active_status(client, producer):
    body = await create_event(client, producer)

    assert body["organizer"] == "Produtora"
    assert body["status"] == "ATIVO"
    assert body["is_free"] is True


async def test_create_event_accepts_category_alias(client, producer):
    body = await create_event(client, producer, category="Música e Reggae")

    assert body["category"] == "reggae"


async def test_create_event_in_the_past_returns_400(client, producer):
    resp = await client.post(
        "/api/eventos", json=event_payload(starts_at=past(1)), headers=producer
    )

    assert resp.status_code == 400


async def test_create_event_ending_before_start_returns_422(client, producer):
    payload = event_payload(ends_at=future(1).isoformat(), starts_at=future(2))

    resp = await client.post("/api/eventos", json=payload, headers=producer)

    assert resp.status_code == 422


async def test_create_event_unknown_category_returns_400(client, producer):
    resp = await client.post(
        "/api/eventos", json=event_payload(category="inexistente"), headers=producer
    )

    assert resp.status_code == 400
    assert resp.json() == {"detail": "Categoria inválida"}


async def test_create_event_notifies_interested_users(client, producer):
    interested = bearer(await register(client, "fa@ilharole.com", interests=["reggae"]))
    opted_out = bearer(await register(client, "quieto@ilharole.com", interests=["reggae"]))
    await client.put(
        "/api/me/preferencias", json={"new_events": False}, headers=opted_out
    )

    await create_event(client, producer, title="Reggae novo")

    notified = (await client.get("/api/me/notificacoes", headers=interested)).json()
    silent = (await client.get("/api/me/notificacoes", headers=opted_out)).json()
    own = (await client.get("/api/me/notificacoes", headers=producer)).json()
    assert [n["type"] for n in notified] == ["NOVO_EVENTO_COMPATIVEL"]
    assert notified[0]["event_title"] == "Reggae novo"
    assert silent == []
    assert own == []


# Edição


async def test_update_event_by_organizer(client, producer):
    event = await create_event(client, producer)

    resp = await client.patch(
        f"/api/eventos/{event['id']}",
        json={"title": "Novo título", "category": "teatro"},
        headers=producer,
    )

    assert resp.status_code == 200
    assert resp.json()["title"] == "Novo título"
    assert resp.json()["category"] == "teatro"


async def test_update_event_by_other_user_returns_403(client, producer):
    event = await create_event(client, producer)
    other = bearer(await register(client, "outra@ilharole.com", role="producer"))

    resp = await client.patch(
        f"/api/eventos/{event['id']}", json={"title": "Invasão"}, headers=other
    )

    assert resp.status_code == 403


async def test_update_unknown_event_returns_404(client, producer):
    resp = await client.patch(
        f"/api/eventos/{uuid.uuid4()}", json={"title": "Nada"}, headers=producer
    )

    assert resp.status_code == 404


async def test_update_event_to_past_date_returns_400(client, producer):
    event = await create_event(client, producer)

    resp = await client.patch(
        f"/api/eventos/{event['id']}",
        json={"starts_at": past(2).isoformat(), "ends_at": past(1).isoformat()},
        headers=producer,
    )

    assert resp.status_code == 400
    assert resp.json() == {"detail": "A data e o horário precisam ser futuros"}
    details = (await client.get(f"/api/eventos/{event['id']}")).json()
    assert details["starts_at"] == event["starts_at"]


async def test_update_schedule_notifies_users_who_saved_the_event(
    client, producer, visitor
):
    event = await create_event(client, producer)
    await client.post(f"/api/eventos/{event['id']}/favorito", headers=visitor)

    starts_at = future(14)
    await client.patch(
        f"/api/eventos/{event['id']}",
        json={
            "starts_at": starts_at.isoformat(),
            "ends_at": future(14, hours=3).isoformat(),
        },
        headers=producer,
    )

    notifications = (await client.get("/api/me/notificacoes", headers=visitor)).json()
    assert [n["type"] for n in notifications] == ["ALTERACAO_EVENTO"]


# Cancelamento


async def test_cancel_event_keeps_record_and_notifies(client, producer, visitor):
    event = await create_event(client, producer)
    await client.post(f"/api/eventos/{event['id']}/favorito", headers=visitor)

    resp = await client.post(f"/api/eventos/{event['id']}/cancelar", headers=producer)

    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELADO"
    details = await client.get(f"/api/eventos/{event['id']}")
    assert details.json()["status"] == "CANCELADO"
    notifications = (await client.get("/api/me/notificacoes", headers=visitor)).json()
    assert [n["type"] for n in notifications] == ["CANCELAMENTO_EVENTO"]


async def test_cancel_event_by_other_user_returns_403(client, producer, visitor):
    event = await create_event(client, producer)

    resp = await client.post(f"/api/eventos/{event['id']}/cancelar", headers=visitor)

    assert resp.status_code == 403


async def test_cancel_event_requires_authentication(client, producer):
    event = await create_event(client, producer)

    resp = await client.post(f"/api/eventos/{event['id']}/cancelar")

    assert resp.status_code == 401


async def test_cancel_unknown_event_returns_404(client, producer):
    resp = await client.post(f"/api/eventos/{uuid.uuid4()}/cancelar", headers=producer)

    assert resp.status_code == 404
