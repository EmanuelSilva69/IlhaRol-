from __future__ import annotations

import re
import unicodedata
import uuid


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return base or "item"


def event_slug(title: str) -> str:
    return f"{slugify(title)}-{uuid.uuid4().hex[:8]}"
