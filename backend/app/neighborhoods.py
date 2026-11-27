"""Bairros aceitos em eventos e perfis.

Lista fechada para manter os filtros do feed e os avisos por bairro
consistentes; é a mesma oferecida nos seletores do front-end.
"""

SAO_LUIS_NEIGHBORHOODS: tuple[str, ...] = (
    "Centro Histórico",
    "Reviver (Praia Grande)",
    "Ponta d'Areia",
    "Lagoa da Jansen",
    "Cohama",
    "Calhau",
    "Renascença",
    "Madre Deus",
)


def ensure_supported_neighborhood(value: str) -> str:
    if value not in SAO_LUIS_NEIGHBORHOODS:
        raise ValueError("Bairro não reconhecido; escolha um dos bairros da lista")
    return value
