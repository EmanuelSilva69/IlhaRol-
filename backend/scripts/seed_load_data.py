"""Popula o banco configurado com dados para o teste de carga.

Cria usuários, locais e eventos marcados (e-mails ``@carga.ilharole.dev`` e
slugs ``carga-``) para que possam ser removidos com ``--reset`` sem afetar o
restante dos dados. Requer as migrações e as categorias do seed de demonstração.

    python -m scripts.seed_load_data --events 1000
    python -m scripts.seed_load_data --reset-only
"""

from __future__ import annotations

import argparse
import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from app.db import SessionLocal, engine
from app.models import (
    Category,
    Event,
    EventCategory,
    Favorite,
    NotificationPreference,
    Review,
    User,
    Venue,
)
from app.security import hash_password
from scripts.load_constants import (
    EMAIL_DOMAIN,
    LOAD_PASSWORD,
    LOAD_USER_EMAIL,
    SLUG_PREFIX,
)

NEIGHBORHOODS = [
    "Centro Histórico",
    "Reviver (Praia Grande)",
    "Ponta d'Areia",
    "Lagoa da Jansen",
    "Cohama",
    "Calhau",
    "Renascença",
    "Madre Deus",
]


async def reset(session) -> None:
    load_users = select(User.id).where(User.email.like(f"%@{EMAIL_DOMAIN}"))
    await session.execute(delete(Event).where(Event.slug.like(f"{SLUG_PREFIX}%")))
    await session.execute(delete(Venue).where(Venue.slug.like(f"{SLUG_PREFIX}%")))
    await session.execute(delete(User).where(User.id.in_(load_users)))
    await session.commit()


async def seed(session, total_events: int, rng: random.Random) -> None:
    categories = list(await session.scalars(select(Category)))
    if not categories:
        raise SystemExit(
            "Nenhuma categoria encontrada. Rode antes o seed de demonstração."
        )

    password_hash = hash_password(LOAD_PASSWORD)
    organizer = User(
        email=f"produtora@{EMAIL_DOMAIN}",
        display_name="Produtora de Carga",
        password_hash=password_hash,
        role="producer",
        neighborhood=NEIGHBORHOODS[0],
    )
    visitor = User(
        email=LOAD_USER_EMAIL,
        display_name="Visitante de Carga",
        password_hash=password_hash,
        neighborhood=NEIGHBORHOODS[1],
    )
    reviewers = [
        User(
            email=f"avaliador{index}@{EMAIL_DOMAIN}",
            display_name=f"Avaliador {index}",
            password_hash=password_hash,
            neighborhood=rng.choice(NEIGHBORHOODS),
        )
        for index in range(20)
    ]
    users = [organizer, visitor, *reviewers]
    session.add_all(users)
    await session.flush()
    session.add_all(NotificationPreference(user_id=user.id) for user in users)

    venues = [
        Venue(
            slug=f"{SLUG_PREFIX}local-{index}",
            name=f"Local de carga {index}",
            address=f"Rua de teste, {index}",
            neighborhood=NEIGHBORHOODS[index % len(NEIGHBORHOODS)],
            latitude=round(-2.53 + rng.uniform(-0.04, 0.04), 6),
            longitude=round(-44.30 + rng.uniform(-0.04, 0.04), 6),
        )
        for index in range(40)
    ]
    session.add_all(venues)
    await session.flush()

    now = datetime.now(timezone.utc)
    events = []
    for index in range(total_events):
        starts_at = now + timedelta(days=rng.uniform(-60, 120))
        events.append(
            Event(
                slug=f"{SLUG_PREFIX}evento-{index}",
                title=f"Evento de carga {index}",
                description="Programação gerada para medir o desempenho da API.",
                venue_id=rng.choice(venues).id,
                organizer_id=organizer.id,
                starts_at=starts_at,
                ends_at=starts_at + timedelta(hours=rng.choice([2, 3, 4])),
                status="cancelled" if rng.random() < 0.05 else "published",
            )
        )
    session.add_all(events)
    await session.flush()

    session.add_all(
        EventCategory(event_id=event.id, category_id=rng.choice(categories).id, is_primary=True)
        for event in events
    )

    for event in events:
        if event.ends_at < now and event.status == "published":
            for reviewer in rng.sample(reviewers, rng.randint(0, 3)):
                session.add(
                    Review(
                        event_id=event.id,
                        user_id=reviewer.id,
                        rating=rng.randint(1, 5),
                        comment="Avaliação gerada para o teste de carga.",
                    )
                )

    upcoming = [event for event in events if event.starts_at > now]
    session.add_all(
        Favorite(user_id=visitor.id, event_id=event.id)
        for event in rng.sample(upcoming, min(30, len(upcoming)))
    )
    await session.commit()


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--reset-only", action="store_true")
    args = parser.parse_args()

    async with SessionLocal() as session:
        await reset(session)
        if not args.reset_only:
            await seed(session, args.events, random.Random(args.seed))
    await engine.dispose()

    if args.reset_only:
        print("Dados de carga removidos.")
    else:
        print(
            f"{args.events} eventos de carga criados. "
            f"Login: {LOAD_USER_EMAIL} / {LOAD_PASSWORD}"
        )


if __name__ == "__main__":
    asyncio.run(main())
