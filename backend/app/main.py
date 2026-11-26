from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .errors import register_error_handlers
from .routers import auth, categories, events, health, profile, reports

settings = get_settings()

app = FastAPI(title="IlhaRolê API", version="0.2.0")
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
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(events.router)
app.include_router(profile.router)
app.include_router(reports.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "IlhaRolê API",
        "version": "0.2.0",
        "docs": "/docs",
        "message": "API com autenticação, eventos, perfil e módulos dependentes do banco.",
    }
