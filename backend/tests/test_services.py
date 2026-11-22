from datetime import datetime, timezone

from app.services import event_slug, format_time_range, slugify


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
