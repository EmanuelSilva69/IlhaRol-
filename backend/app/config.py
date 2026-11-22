from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração da API, sempre lida do ambiente."""

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_db: str
    postgres_user: str
    postgres_password: str
    postgres_host: str
    postgres_port: int = 5432

    database_url: str | None = None
    cors_origins: str = "http://localhost:5173"

    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800
    db_connect_timeout: int = 5
    db_statement_cache_size: int = 100
    db_application_name: str = "ilharole-api"

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        user = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password)
        return (
            f"postgresql+asyncpg://{user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
