import uuid

from conftest import create_event, future, insert_event, past

ORGANIZER = "produtora@ilharole.com"


# Favoritos e agenda


async def test_favorite_requires_authentication(client, producer):
    event = await create_event(client, producer)

    resp = await client.post(f"/api/eventos/{event['id']}/favorito")

    assert resp.status_code == 401


async def test_favorite_is_idempotent(client, producer, visitor):
    event = await create_event(client, producer)
    url = f"/api/eventos/{event['id']}/favorito"

    first = await client.post(url, headers=visitor)
    second = await client.post(url, headers=visitor)

    assert first.json() == {"favorite": True}
    assert second.status_code == 200
    assert len((await client.get("/api/me/agenda", headers=visitor)).json()) == 1


async def test_favorite_unknown_event_returns_404(client, visitor):
    resp = await client.post(f"/api/eventos/{uuid.uuid4()}/favorito", headers=visitor)

    assert resp.status_code == 404


async def test_unfavorite_removes_only_own_link(client, producer, visitor):
    event = await create_event(client, producer)
    url = f"/api/eventos/{event['id']}/favorito"
    await client.post(url, headers=visitor)
    await client.post(url, headers=producer)

    resp = await client.delete(url, headers=visitor)

    assert resp.json() == {"favorite": False}
    assert (await client.get("/api/me/agenda", headers=visitor)).json() == []
    assert len((await client.get("/api/me/agenda", headers=producer)).json()) == 1


async def test_agenda_requires_authentication(client):
    resp = await client.get("/api/me/agenda")

    assert resp.status_code == 401


async def test_agenda_lists_favorites_in_chronological_order(client, producer, visitor):
    later = await create_event(client, producer, title="Depois", starts_at=future(9))
    sooner = await create_event(client, producer, title="Antes", starts_at=future(2))
    await create_event(client, producer, title="Não salvo")
    for event in (later, sooner):
        await client.post(f"/api/eventos/{event['id']}/favorito", headers=visitor)

    agenda = (await client.get("/api/me/agenda", headers=visitor)).json()

    assert [e["title"] for e in agenda] == ["Antes", "Depois"]
    assert all(e["is_favorite"] for e in agenda)


# Avaliações


async def test_review_past_event_returns_201(client, producer, visitor, session_factory):
    event_id = await insert_event(session_factory, ORGANIZER, past())

    resp = await client.post(
        f"/api/eventos/{event_id}/avaliacoes",
        json={"rating": 5, "comment": "Incrível"},
        headers=visitor,
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["rating"] == 5
    assert body["comment"] == "Incrível"
    assert body["author"] == "Beto"


async def test_review_requires_authentication(client, producer, session_factory):
    event_id = await insert_event(session_factory, ORGANIZER, past())

    resp = await client.post(f"/api/eventos/{event_id}/avaliacoes", json={"rating": 4})

    assert resp.status_code == 401


async def test_review_future_event_returns_400(client, producer, visitor):
    event = await create_event(client, producer)

    resp = await client.post(
        f"/api/eventos/{event['id']}/avaliacoes", json={"rating": 4}, headers=visitor
    )

    assert resp.status_code == 400


async def test_review_cancelled_event_returns_400(
    client, producer, visitor, session_factory
):
    event_id = await insert_event(session_factory, ORGANIZER, past(), status="cancelled")

    resp = await client.post(
        f"/api/eventos/{event_id}/avaliacoes", json={"rating": 4}, headers=visitor
    )

    assert resp.status_code == 400
    assert resp.json() == {"detail": "Evento cancelado não pode ser avaliado"}


async def test_review_duplicate_returns_409(client, producer, visitor, session_factory):
    event_id = await insert_event(session_factory, ORGANIZER, past())
    url = f"/api/eventos/{event_id}/avaliacoes"
    await client.post(url, json={"rating": 4}, headers=visitor)

    resp = await client.post(url, json={"rating": 2}, headers=visitor)

    assert resp.status_code == 409


async def test_review_rating_out_of_range_returns_422(
    client, producer, visitor, session_factory
):
    event_id = await insert_event(session_factory, ORGANIZER, past())
    url = f"/api/eventos/{event_id}/avaliacoes"

    low = await client.post(url, json={"rating": 0}, headers=visitor)
    high = await client.post(url, json={"rating": 6}, headers=visitor)

    assert low.status_code == 422
    assert high.status_code == 422


async def test_review_unknown_event_returns_404(client, visitor):
    resp = await client.post(
        f"/api/eventos/{uuid.uuid4()}/avaliacoes", json={"rating": 4}, headers=visitor
    )

    assert resp.status_code == 404


async def test_list_reviews_of_event(client, producer, visitor, session_factory):
    event_id = await insert_event(session_factory, ORGANIZER, past())
    url = f"/api/eventos/{event_id}/avaliacoes"
    await client.post(url, json={"rating": 5}, headers=visitor)
    await client.post(url, json={"rating": 3}, headers=producer)

    resp = await client.get(url)

    assert resp.status_code == 200
    assert sorted(r["rating"] for r in resp.json()) == [3, 5]


# Denúncias


async def test_report_event_keeps_content_and_lists_in_my_reports(
    client, producer, visitor
):
    event = await create_event(client, producer)

    resp = await client.post(
        "/api/denuncias",
        json={"target_type": "EVENTO", "event_id": event["id"], "reason": "SPAM"},
        headers=visitor,
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "EM_ANALISE"
    assert body["event_id"] == event["id"]
    assert "reporter_id" not in body
    assert (await client.get(f"/api/eventos/{event['id']}")).status_code == 200
    mine = (await client.get("/api/me/denuncias", headers=visitor)).json()
    assert [r["id"] for r in mine] == [body["id"]]


async def test_report_review_links_its_event(client, producer, visitor, session_factory):
    event_id = await insert_event(session_factory, ORGANIZER, past())
    review = await client.post(
        f"/api/eventos/{event_id}/avaliacoes",
        json={"rating": 1, "comment": "ofensivo"},
        headers=producer,
    )

    resp = await client.post(
        "/api/denuncias",
        json={
            "target_type": "AVALIACAO",
            "review_id": review.json()["id"],
            "reason": "DISCURSO_OFENSIVO",
        },
        headers=visitor,
    )

    assert resp.status_code == 201
    assert resp.json()["review_id"] == review.json()["id"]
    assert resp.json()["event_id"] == event_id


async def test_report_requires_authentication(client, producer):
    event = await create_event(client, producer)

    resp = await client.post(
        "/api/denuncias", json={"target_type": "EVENTO", "event_id": event["id"]}
    )

    assert resp.status_code == 401


async def test_report_requires_target_id(client, visitor):
    no_event = await client.post(
        "/api/denuncias", json={"target_type": "EVENTO"}, headers=visitor
    )
    no_review = await client.post(
        "/api/denuncias", json={"target_type": "AVALIACAO"}, headers=visitor
    )

    assert no_event.status_code == 400
    assert no_review.status_code == 400


async def test_report_invalid_reason_returns_422(client, producer, visitor):
    event = await create_event(client, producer)

    resp = await client.post(
        "/api/denuncias",
        json={"target_type": "EVENTO", "event_id": event["id"], "reason": "QUALQUER"},
        headers=visitor,
    )

    assert resp.status_code == 422


async def test_report_unknown_target_returns_404(client, visitor):
    event = await client.post(
        "/api/denuncias",
        json={"target_type": "EVENTO", "event_id": str(uuid.uuid4())},
        headers=visitor,
    )
    review = await client.post(
        "/api/denuncias",
        json={"target_type": "AVALIACAO", "review_id": str(uuid.uuid4())},
        headers=visitor,
    )

    assert event.status_code == 404
    assert review.status_code == 404


# Notificações


async def test_mark_notifications_as_read(client, producer, visitor):
    event = await create_event(client, producer)
    await client.post(f"/api/eventos/{event['id']}/favorito", headers=visitor)
    await client.post(f"/api/eventos/{event['id']}/cancelar", headers=producer)

    resp = await client.post("/api/me/notificacoes/lidas", headers=visitor)

    assert resp.status_code == 200
    notifications = (await client.get("/api/me/notificacoes", headers=visitor)).json()
    assert notifications and all(n["read"] for n in notifications)
