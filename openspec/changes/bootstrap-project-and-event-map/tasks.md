# Tasks

## 1. Estrutura e configuração base

- [x] 1.1 Criar as pastas `backend/` e `frontend/`, o `.gitignore` raiz (`.env`, `node_modules/`, `dist/`, `__pycache__/`, `.venv/`) e o `.env.example` com `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST=db`, `POSTGRES_PORT=5432`, `API_PORT=8000` e `WEB_PORT=5173`; verificar que o `.env.example` não contém credenciais reais e que os padrões ignorados estão listados.
- [x] 1.2 Criar `.dockerignore` em `backend/` e `frontend/` excluindo `.venv`, `__pycache__`, `node_modules` e `dist`; verificar com `docker build` que o contexto não inclui essas pastas (saída do build sem cache de dependências do host).

## 2. Banco de dados e orquestração

- [x] 2.1 Adicionar o serviço `db` ao `docker-compose.yml` com `postgres:16-alpine`, volume nomeado `ilharole_pgdata`, healthcheck `pg_isready` e variáveis `POSTGRES_*` lidas do `.env`; verificar com `docker compose config` e `docker compose up -d db` seguido de `docker compose ps` mostrando o serviço `healthy`.
- [x] 2.2 Verificar a persistência do banco criando uma tabela de teste, executando `docker compose restart db` e confirmando que a tabela continua existindo; repetir após `docker compose down` e `up -d db` sem `-v`.

## 3. Back-end FastAPI

- [x] 3.1 Criar `backend/requirements.txt` (FastAPI, Uvicorn, SQLAlchemy, asyncpg, pydantic-settings, pytest, pytest-asyncio, httpx) e `backend/Dockerfile` baseado em `python:3.12-slim`; verificar com `docker build -t ilharole-api ./backend`.
- [x] 3.2 Implementar `backend/app/config.py` (settings a partir de `POSTGRES_*` ou `DATABASE_URL`), `backend/app/db.py` (engine assíncrono) e `backend/app/main.py` com CORS básico; verificar que a aplicação inicia com `uvicorn app.main:app` e que nenhuma credencial está fixa no código.
- [x] 3.3 Implementar `GET /health` executando `SELECT 1`: retornar `200` com `{"status":"ok","database":"connected"}` quando o banco responde e `503` com `{"status":"degraded","database":"disconnected"}` quando não responde, sem expor detalhes internos; verificar os dois casos com o banco ligado e desligado.
- [x] 3.4 Adicionar o serviço `api` ao `docker-compose.yml` com build, porta `${API_PORT}:8000`, volume de código para hot reload, `depends_on` com `condition: service_healthy` e variáveis de ambiente; verificar com `docker compose up -d db api` e `curl http://localhost:8000/health` retornando `200` e `"database":"connected"`.
- [x] 3.5 Criar testes em `backend/tests/test_health.py` cobrindo banco conectado e desconectado com dependência substituível; verificar com `docker compose run --rm api pytest -q`.
- [x] 3.6 Documentar no README a execução do back-end, as variáveis de ambiente e o contrato do `/health`; verificar que os comandos documentados funcionam como escritos.

## 4. Front-end React/Vite/Tailwind

- [x] 4.1 Criar `frontend/package.json`, `vite.config.ts` com o plugin React e `@tailwindcss/vite`, `index.html`, `src/main.tsx`, `src/App.tsx` e `src/index.css` com `@import "tailwindcss";`; verificar com `npm install` e `npm run build`.
- [x] 4.2 Criar `frontend/Dockerfile` baseado em `node:22-alpine` e adicionar o serviço `web` ao `docker-compose.yml` com porta `${WEB_PORT}:5173`, volume de código e volume anônimo para `node_modules`; verificar com `docker compose up -d web` e acesso a `http://localhost:5173`.
- [x] 4.3 Documentar no README a execução do front-end e o fluxo de hot reload; verificar que os comandos documentados sobem a aplicação.

## 5. Componente de mapa

- [x] 5.1 Instalar `leaflet` e `@types/leaflet`, criar `src/types/event.ts` com `MapEvent` e `EventCategory`, e helpers puros para normalizar categoria (minúsculas, sem acentos) e escolher o tema; verificar com testes unitários Vitest para `"Música"`, `"TEATRO"`, `"gastronomia"` e valor desconhecido.
- [x] 5.2 Implementar `src/components/EventMap.tsx` com criação imperativa do mapa em `useEffect`, centro padrão `[-2.5307, -44.3068]`, zoom 13, cleanup com `map.remove()` e proteção contra dupla inicialização; verificar que o mapa renderiza no `App` e que não há erro de "container already initialized" em modo desenvolvimento.
- [x] 5.3 Implementar a troca de temas com `light` (CARTO Positron), `dark` (CARTO DarkMatter) e `thematic` (Positron + filtro CSS), mantendo a atribuição OSM/CARTO; verificar visualmente que os três modos alteram os tiles e que a atribuição permanece visível.
- [x] 5.4 Adicionar `src/components/EventMap.css` com altura mínima, estilos de `.leaflet-container`, filtro restrito a `.leaflet-tile-pane` no modo temático e fundo transparente para `.event-marker`; verificar que marcadores e controles não recebem o filtro.
- [x] 5.5 Criar testes Vitest para o mapeamento de tema → URL de tiles e para a renderização do contêiner do mapa; verificar com `npm test`.
- [x] 5.6 Documentar o uso do `EventMap` (props, exemplo de chamada e requisito de altura do contêiner) em `frontend/README.md`; verificar que o exemplo corresponde à interface implementada.

## 6. Marcadores SVG animados

- [x] 6.1 Criar `src/assets/markers/music.svg` com nota musical pulsando, classes prefixadas `ir-music-*` e bloco `@media (prefers-reduced-motion: reduce)` desativando a animação; verificar abrindo o SVG no navegador e com a preferência de movimento reduzido ativada.
- [x] 6.2 Criar `src/assets/markers/theater.svg` com duas máscaras balançando em sentidos opostos, classes `ir-theater-*` e respeito a movimento reduzido; verificar visualmente a animação e a versão estática.
- [x] 6.3 Criar `src/assets/markers/gastronomy.svg` com prato em rotação lenta e vapor subindo com fade, classes `ir-gastronomy-*` e respeito a movimento reduzido; verificar visualmente a animação e a versão estática.
- [x] 6.4 Implementar a fábrica de ícones que importa os SVGs com `?raw` e monta `L.divIcon` com `iconSize: [44, 52]`, `iconAnchor: [22, 50]`, `className: "event-marker"`, `aria-label`/`title` com título e categoria escapados e marcador neutro para categoria desconhecida; verificar com testes unitários de seleção de ícone e de escape de HTML malicioso.
- [x] 6.5 Integrar os marcadores ao `EventMap` para criar/remover marcadores conforme a prop `events` e renderizar um conjunto de exemplo no `App` com as três categorias; verificar que os três marcadores aparecem nas coordenadas corretas e animam.
- [x] 6.6 Documentar em `frontend/README.md` como adicionar uma nova categoria de marcador e como os SVGs são injetados; verificar que o passo a passo corresponde ao código.

## 7. Integração e verificação final

- [x] 7.1 Executar `docker compose up --build -d` a partir de um ambiente limpo; verificar com `docker compose ps` que `db`, `api` e `web` estão saudáveis e com `curl http://localhost:8000/health` e `curl http://localhost:5173` respondendo com sucesso.
- [x] 7.2 Executar a verificação visual: mapa centrado em São Luís, alternância dos três temas, três marcadores animados, marcador neutro para categoria desconhecida e animações desligadas com `prefers-reduced-motion`; registrar o resultado no README ou na descrição da entrega.
- [x] 7.3 Rodar toda a suíte (`docker compose run --rm api pytest -q`, `docker compose run --rm web npm test` e `npm run build` no front-end); verificar que todos passam e que o build de produção é gerado.
- [x] 7.4 Revisar o README do zero seguindo apenas as instruções escritas; verificar que uma pessoa consegue copiar `.env.example`, subir a stack e abrir o mapa sem passos não documentados.

## Workflow follow-up

- Arquivar a mudança após a revisão da equipe e a aprovação dos testes.
- Verificar o resultado arquivado em `openspec/specs/project-infrastructure/` e `openspec/specs/event-map/`.
