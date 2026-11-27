from datetime import datetime, timezone

import pytest

from app.serializers import format_time_range
from app.services.events import weekend_window
from app.slugs import event_slug, slugify


def test_slugify_removes_accents_and_spaces():
    assert slugify("Bumba Meu Boi") == "bumba-meu-boi"
    assert slugify("Música/Reggae") == "musica-reggae"
    assert slugify("  Praça  Maria   Aragão  ") == "praca-maria-aragao"


def test_event_slug_has_unique_suffix():
    first = event_slug("Roda de Samba")
    second = event_slug("Roda de Samba")

    assert first.startswith("roda-de-samba-")
    assert second.startswith("roda-de-samba-")
    assert first != second


def test_format_time_range_same_day():
    starts = datetime(2026, 12, 6, 18, 0, tzinfo=timezone.utc)
    ends = datetime(2026, 12, 6, 22, 0, tzinfo=timezone.utc)

    assert format_time_range(starts, ends) == "15:00 às 19:00"


@pytest.mark.parametrize(
    "now",
    [
        "2026-11-25T15:00:00-03:00",  # quarta: próximo fim de semana
        "2026-11-28T10:00:00-03:00",  # sábado: fim de semana corrente
        "2026-11-29T23:00:00-03:00",  # domingo à noite: ainda o corrente
    ],
)
def test_weekend_window_covers_saturday_and_sunday(now):
    start, end = weekend_window(datetime.fromisoformat(now))

    assert start.isoformat() == "2026-11-28T00:00:00-03:00"
    assert end.isoformat() == "2026-11-30T00:00:00-03:00"


def test_weekend_window_moves_on_after_sunday():
    start, _ = weekend_window(datetime.fromisoformat("2026-11-30T01:00:00-03:00"))

    assert start.isoformat() == "2026-12-05T00:00:00-03:00"
