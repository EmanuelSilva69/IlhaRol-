from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .errors import register_error_handlers
from .routers import health

settings = get_settings()

app = FastAPI(title="IlhaRolê API", version="0.1.0")
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in settings.cors_origins.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "IlhaRolê API (protótipo)",
        "docs": "/docs",
        "message": "Esqueleto da API. Endpoints de negócio serão implementados pelas equipes.",
    }
