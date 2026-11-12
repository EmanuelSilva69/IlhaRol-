# IlhaRolê

Protótipo de plataforma web de agenda cultural e eventos em São Luís (MA). O projeto está dividido em três frentes de trabalho:

- `devops/` — Docker, PostgreSQL, ambiente e scripts de banco;
- `backend/` — esqueleto da API em FastAPI;
- `frontend/` — wireframe em React/Vite com o componente de mapa.

O restante do produto (autenticação, CRUD de eventos, feed, favoritos, avaliações e notificações) será construído pelas equipes responsáveis sobre esta base.

## Estado atual

Este repositório é um **protótipo**, não um site final:

- o front-end é um wireframe preto e branco, com textos como “HEADER AQUI” e “possível local de informação”;
- o back-end expõe apenas a rota raiz e a verificação de saúde;
- o mapa Leaflet, os temas e os marcadores animados são o único componente funcional da interface.

## Estrutura

```text
.
├── devops/             # Docker, banco, ambiente e scripts
├── backend/            # API FastAPI
├── frontend/           # Wireframe React/Vite
├── documentos/         # Documentos iniciais do projeto
├── openspec/           # Especificações e mudanças do projeto
└── README.md
```

## Stack

- **Banco:** PostgreSQL 16
- **Back-end:** Python 3.12 + FastAPI + SQLAlchemy assíncrono + asyncpg
- **Front-end:** React 19 + Vite + Tailwind CSS 4 + Leaflet
- **Infra local:** Docker e Docker Compose

## Pré-requisitos

- Docker Desktop com Docker Compose v2
- Node.js 22+ (apenas para executar o front-end sem Docker)
- Portas `8000` e `5173` livres no host

## Configuração inicial

```powershell
Copy-Item devops\.env.example devops\.env
```

```bash
# Linux/macOS
cp devops/.env.example devops/.env
```

O arquivo `devops/.env` é ignorado pelo Git. Nunca versione credenciais reais.

### Variáveis de ambiente

| Variável | Padrão no exemplo | Descrição |
| --- | --- | --- |
| `POSTGRES_DB` | `ilharole` | Nome do banco criado pelo PostgreSQL |
| `POSTGRES_USER` | `ilharole` | Usuário do banco |
| `POSTGRES_PASSWORD` | `change-me-in-local-env` | Senha local do banco |
| `POSTGRES_HOST` | `db` | Host do banco na rede interna do Compose |
| `POSTGRES_PORT` | `5432` | Porta interna do PostgreSQL |
| `API_PORT` | `8000` | Porta da API no host |
| `WEB_PORT` | `5173` | Porta da interface no host |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens autorizadas a chamar a API |
| `CARTO_API_KEY` | vazio | Chave dos Basemaps CARTO; fica só no `devops/.env` local |

A chave `CARTO_API_KEY` é repassada ao front-end como `VITE_CARTO_API_KEY`. Variáveis `VITE_*` são incorporadas ao bundle do navegador, então a chave é pública em execução; restrinja os domínios permitidos no painel da CARTO.

## Subir a stack

A partir da raiz do repositório:

```bash
docker compose -f devops/docker-compose.yml up --build -d
docker compose -f devops/docker-compose.yml ps
```

Serviços esperados:

| Serviço | Endereço | Verificação |
| --- | --- | --- |
| `web` | http://localhost:5173 | Wireframe React/Vite |
| `api` | http://localhost:8000 | API FastAPI |
| `api` (docs) | http://localhost:8000/docs | Documentação OpenAPI |
| `db` | rede interna `ilharole` | PostgreSQL, sem porta publicada no host |

Para acompanhar os logs:

```bash
docker compose -f devops/docker-compose.yml logs -f api
```

Para parar o ambiente:

```bash
docker compose -f devops/docker-compose.yml down
```

Os dados do PostgreSQL permanecem no volume `ilharole_pgdata`. Para descartar os dados de forma explícita:

```bash
docker compose -f devops/docker-compose.yml down -v
```

## Back-end

O back-end é um esqueleto declaradamente de protótipo. Rotas disponíveis:

- `GET /` — identifica a API como protótipo;
- `GET /health` — verifica a conexão com o banco;
- `GET /docs` — Swagger UI.

Detalhes em [`backend/README.md`](backend/README.md).

```bash
docker compose -f devops/docker-compose.yml up -d db api
curl http://localhost:8000/health
```

### Testes do back-end

```bash
docker compose -f devops/docker-compose.yml run --rm api pytest -q
```

## Front-end

O front-end é um wireframe de baixa fidelidade. O mapa é o único componente funcional e está documentado em [`frontend/README.md`](frontend/README.md).

```bash
docker compose -f devops/docker-compose.yml up -d web
```

Acesse http://localhost:5173. O diretório `frontend/` é montado como volume e o Vite observa alterações com polling.

### Executar sem Docker

```bash
cd frontend
npm install
npm run dev
```

### Testes e build do front-end

```bash
cd frontend
npm test
npm run build
```

Ou, com Docker:

```bash
docker compose -f devops/docker-compose.yml run --rm web npm test
```

## Banco de dados

O serviço `db` usa o volume `ilharole_pgdata` e executa os scripts de `devops/db/init/` apenas na primeira criação do volume. Consulte [`devops/db/README.md`](devops/db/README.md) para conexão, reset, backup e restauração.

```powershell
.\devops\scripts\db-shell.ps1
.\devops\scripts\db-backup.ps1
```

```bash
./devops/scripts/db-shell.sh
./devops/scripts/db-backup.sh
```

## DevOps

Toda a infraestrutura está em [`devops/`](devops/README.md): `docker-compose.yml`, Dockerfiles, `.env.example`, inicialização do banco e scripts.

## Verificação

Verificação executada em 12/11/2026:

- `docker compose -f devops/docker-compose.yml up --build -d`: `db`, `api` e `web` ficaram `healthy`.
- `GET http://localhost:8000/health`: `200` com `{"status":"ok","database":"connected"}`.
- `GET http://localhost:8000/`: resposta identifica a API como protótipo.
- `http://localhost:5173`: wireframe com “Header aqui”, “Feed de eventos”, “Mapa de eventos” e “Footer aqui”.
- Mapa: temas claro, escuro e temático funcionando; 4 marcadores de exemplo, incluindo o neutro.
- `prefers-reduced-motion: reduce`: animações dos marcadores desligadas.
- Testes: 2 no back-end e 12 no front-end; build de produção gerado.
- Scripts `db-shell` e `db-backup` testados; script de inicialização executado em volume novo.

## Publicação

Repositório: https://github.com/EmanuelSilva69/IlhaRol-

## Comentários
- Emanuel -> deixei o openspec ai pois ele é legal de ver os planos e oq falta fazer, se quiserem usar ele, façam um novo planejamento e vão botando lá, fica mais fácil de rastrear oq a ia fez e tal
