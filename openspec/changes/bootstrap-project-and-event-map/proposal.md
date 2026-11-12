# Proposal

## Why

O repositório do IlhaRolê contém apenas a documentação de especificação; ainda não existe uma base executável para a equipe desenvolver e validar o produto. Esta mudança cria o esqueleto containerizado (PostgreSQL, FastAPI e React/Vite) e a primeira peça visual de valor: o mapa de eventos com marcadores por categoria, necessário para o RF04 (detalhes e localização do evento).

## What Changes

- Adicionar `docker-compose.yml` com três serviços: `db` (PostgreSQL), `api` (FastAPI na porta 8000) e `web` (React/Vite na porta 5173), com volumes, rede interna, healthcheck do banco e variáveis de ambiente para conexão da API ao PostgreSQL pelo hostname do serviço.
- Adicionar `Dockerfile` de desenvolvimento para back-end e front-end, além de `.env.example` e `.dockerignore`.
- Criar o esqueleto do back-end em FastAPI com configuração lida de variáveis de ambiente e conexão ao PostgreSQL, sem implementar ainda os endpoints de negócio do IlhaRolê.
- Criar o esqueleto do front-end com React + Vite + Tailwind CSS, incluindo a estrutura de pastas e o ponto de montagem da aplicação.
- Criar o componente `EventMap.tsx` com Leaflet/OpenStreetMap, centralizado em São Luís (MA), com suporte a temas claro, escuro e temático por meio de provedor de tiles e/ou filtros CSS.
- Criar três SVGs animados de marcadores — Música, Teatro e Gastronomia — e um exemplo de injeção via `L.divIcon` no `EventMap.tsx`, selecionando o ícone conforme a categoria do evento.
- Documentar no README como subir a stack e executar cada serviço localmente.

## Capabilities

### New Capabilities

- `project-infrastructure`: ambiente local executável com PostgreSQL, API FastAPI e front-end Vite, incluindo configuração por variáveis de ambiente, portas e comunicação entre contêineres.
- `event-map`: exibição de eventos em mapa interativo com Leaflet/OpenStreetMap, centralização em São Luís, temas visuais e marcadores animados por categoria.

### Modified Capabilities

Nenhuma. O projeto ainda não possui specs em `openspec/specs/`.

## Impact

- **Novos diretórios/arquivos**: `backend/`, `frontend/`, `docker-compose.yml`, `.env.example`, `README.md`.
- **Back-end**: FastAPI, Uvicorn, driver/cliente PostgreSQL e dependências de configuração; porta 8000.
- **Front-end**: React, Vite, Tailwind CSS, Leaflet e react-leaflet; porta 5173.
- **Infraestrutura**: Docker e Docker Compose; volume persistente para os dados do PostgreSQL.
- **Riscos**: disponibilidade e políticas de uso dos tiles gratuitos (OpenStreetMap/Carto); o mapa deve manter a atribuição e não depender de chaves pagas.
- **Fora de escopo**: autenticação, CRUD de eventos, feed, favoritos, avaliações e demais RFs; esta mudança entrega somente a base técnica e a visualização do mapa.
