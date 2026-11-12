import os

# A configuração é obrigatória; os testes não acessam o banco real.
os.environ.setdefault("POSTGRES_DB", "ilharole_test")
os.environ.setdefault("POSTGRES_USER", "ilharole_test")
os.environ.setdefault("POSTGRES_PASSWORD", "test-password")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
