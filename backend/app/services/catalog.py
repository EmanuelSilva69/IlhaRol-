from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category, Venue
from ..neighborhoods import SAO_LUIS_NEIGHBORHOODS
from ..repositories import catalog as catalog_repo
from ..schemas import CategoryRead
from ..slugs import slugify

CATEGORY_ALIASES = {
    "bumba-meu-boi": "bumba-meu-boi",
    "musica-e-reggae": "reggae",
    "musica-reggae": "reggae",
    "reggae": "reggae",
    "teatro": "teatro",
    "gastronomia": "gastronomia",
    "museus": "museus",
    "museu": "museus",
    "tambor-de-crioula": "tambor-de-crioula",
    "samba-e-pagode": "samba-pagode",
    "samba-pagode": "samba-pagode",
    "pagode": "samba-pagode",
    "orla-e-praia": "orla-praia",
    "orla-praia": "orla-praia",
    "praia": "orla-praia",
    "feirinhas": "feirinhas-artesanato",
    "feirinhas-e-artesanato": "feirinhas-artesanato",
    "feirinhas-artesanato": "feirinhas-artesanato",
    "artesanato": "feirinhas-artesanato",
    "cinema": "cinema-audiovisual",
    "cinema-audiovisual": "cinema-audiovisual",
    "audiovisual": "cinema-audiovisual",
}


async def list_categories(session: AsyncSession) -> list[CategoryRead]:
    return [
        CategoryRead(id=str(category.id), slug=category.slug, name=category.name)
        for category in await catalog_repo.list_categories(session)
    ]


def list_neighborhoods() -> list[str]:
    return list(SAO_LUIS_NEIGHBORHOODS)


async def resolve_category(session: AsyncSession, value: str) -> Category | None:
    """Aceita slug, apelido (``Música e Reggae``) ou nome da categoria."""
    raw = value.strip()
    alias = CATEGORY_ALIASES.get(slugify(raw))

    for candidate in (alias, raw):
        if not candidate:
            continue
        category = await catalog_repo.find_category_by_slug(session, candidate)
        if category is not None:
            return category

    return await catalog_repo.find_category_by_name(session, raw)


async def get_or_create_venue(
    session: AsyncSession,
    *,
    name: str,
    address: str | None,
    neighborhood: str | None,
    latitude: float | None,
    longitude: float | None,
    created_by: uuid.UUID,
) -> Venue:
    """Reaproveita o local pelo slug do nome e completa dados que faltarem."""
    slug = slugify(name)
    venue = await catalog_repo.find_venue_by_slug(session, slug)
    if venue is None:
        venue = Venue(
            slug=slug,
            name=name,
            address=address,
            neighborhood=neighborhood,
            latitude=latitude,
            longitude=longitude,
            created_by=created_by,
        )
        session.add(venue)
        await session.flush()
        return venue

    changed = False
    if address and not venue.address:
        venue.address = address
        changed = True
    if neighborhood and not venue.neighborhood:
        venue.neighborhood = neighborhood
        changed = True
    if latitude is not None and venue.latitude is None:
        venue.latitude = latitude
        changed = True
    if longitude is not None and venue.longitude is None:
        venue.longitude = longitude
        changed = True
    if changed:
        await session.flush()

    return venue
