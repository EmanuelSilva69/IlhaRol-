# DevOps — IlhaRolê

Esta pasta concentra Docker, PostgreSQL, variáveis de ambiente e scripts de apoio. É o ponto de trabalho da equipe de DB/DevOps.

## Estrutura

```text
devops/
├── .env.example
├── docker-compose.yml
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── db/
│   ├── README.md
│   └── init/
│       └── 01-init.sql
└── scripts/
    ├── db-backup.ps1
    ├── db-backup.sh
    ├── db-shell.ps1
    └── db-shell.sh
```

## Primeira execução

A partir da raiz do repositório:

```powershell
Copy-Item devops\.env.example devops\.env
docker compose -f devops/docker-compose.yml up --build -d
docker compose -f devops/docker-compose.yml ps
```

```bash
cp devops/.env.example devops/.env
docker compose -f devops/docker-compose.yml up --build -d
docker compose -f devops/docker-compose.yml ps
```

O Compose lê `devops/.env` automaticamente porque o arquivo está ao lado do `docker-compose.yml`.

## Serviços

| Serviço | Endereço | Observação |
| --- | --- | --- |
| `web` | http://localhost:5173 | React/Vite com hot reload |
| `api` | http://localhost:8000 | FastAPI; documentação em `/docs` |
| `db` | rede interna `ilharole` | PostgreSQL 16, sem porta publicada |

## Comandos úteis

```bash
# logs
docker compose -f devops/docker-compose.yml logs -f api

# parar sem apagar dados
docker compose -f devops/docker-compose.yml down

# apagar também o volume do banco (ação destrutiva)
docker compose -f devops/docker-compose.yml down -v

# reconstruir um serviço
docker compose -f devops/docker-compose.yml up -d --build web
```

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `POSTGRES_DB` | `ilharole` | Banco criado pelo PostgreSQL |
| `POSTGRES_USER` | `ilharole` | Usuário do banco |
| `POSTGRES_PASSWORD` | `change-me-in-local-env` | Senha local |
| `POSTGRES_HOST` | `db` | Host interno usado pela API |
| `POSTGRES_PORT` | `5432` | Porta interna |
| `API_PORT` | `8000` | Porta da API no host |
| `WEB_PORT` | `5173` | Porta da interface no host |
| `CORS_ORIGINS` | `http://localhost:5173` | Origem autorizada |

O `.env` é ignorado pelo Git. Nunca versione credenciais reais.

## Banco de dados

Os scripts em `devops/db/init/` rodam apenas na primeira criação do volume. Consulte [`db/README.md`](db/README.md) para conexão, reset, backup e restauração.

```powershell
# abrir o psql
.\devops\scripts\db-shell.ps1

# executar uma consulta
.\devops\scripts\db-shell.ps1 "SELECT version();"

# gerar backup
.\devops\scripts\db-backup.ps1
```

```bash
./devops/scripts/db-shell.sh
./devops/scripts/db-shell.sh "SELECT version();"
./devops/scripts/db-backup.sh
```

## Dockerfiles

Os Dockerfiles ficam em `devops/docker/` e são referenciados pelo Compose com contextos separados:

- `backend.Dockerfile` usa o contexto `../backend`;
- `frontend.Dockerfile` usa o contexto `../frontend`.

Assim, cada imagem instala apenas as dependências da sua aplicação.

## Problemas comuns

- **Porta ocupada:** altere `API_PORT` ou `WEB_PORT` no `devops/.env` e recrie os serviços.
- **Variáveis vazias:** confirme que `devops/.env` existe e foi criado a partir de `.env.example`.
- **Mudanças no banco não aparecem:** scripts de `db/init/` só rodam em volume novo; use `down -v` para recriar.
- **Docker daemon indisponível:** inicie o Docker Desktop e aguarde o motor ficar pronto.
