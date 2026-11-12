# Design

## Context

Ver `proposal.md` — Why. O repositório está vazio de código: existem apenas os documentos de especificação e o esqueleto do OpenSpec. A mudança cria a primeira base executável e não depende de código existente. As restrições vêm dos RNFs do projeto: mobile-first, acessibilidade, PostgreSQL com integridade e API REST em JSON.

## Goals / Non-Goals

**Goals:**

- Subir a stack completa com um comando e hot reload nos dois serviços de aplicação.
- Estabelecer contratos claros de configuração (variáveis de ambiente) e de saúde dos serviços.
- Entregar o mapa como componente reutilizável, com dados de evento desacoplados da fonte (API futura).
- Garantir que os marcadores animados não prejudiquem acessibilidade nem a legibilidade do mapa.

**Non-Goals:**

- Implementar endpoints de eventos, autenticação, feed, favoritos ou avaliações.
- Definir o schema definitivo de eventos no banco; nesta mudança o PostgreSQL é apenas infraestrutura.
- Configurar deploy em produção, HTTPS, backup automatizado ou observabilidade.
- Implementar busca de endereço, geocodificação ou rotas no mapa.

## Decisions

### 1. Monorepo com `backend/` e `frontend/`

**Decisão:** manter os dois serviços em pastas independentes na raiz, cada um com seu `Dockerfile`, e o `docker-compose.yml` na raiz.

**Por quê:** reflete a separação SPA/API REST já definida na documentação e permite que cada serviço evolua e seja testado isoladamente.

**Alternativas:** um único contêiner com os dois processos (mais simples, porém foge da arquitetura definida e dificulta o hot reload); repositórios separados (mais atrito para a equipe).

### 2. PostgreSQL 16 com volume nomeado e healthcheck

**Decisão:** serviço `db` com `postgres:16-alpine`, volume nomeado `ilharole_pgdata`, healthcheck com `pg_isready` e variáveis `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` vindas do `.env`.

**Por quê:** o healthcheck evita que a API e o front-end iniciem antes do banco aceitar conexões; o volume atende à persistência exigida.

**Alternativas:** banco no host (quebra a reprodutibilidade); sem healthcheck (a API precisaria de lógica de retry mais complexa).

### 3. API FastAPI com SQLAlchemy 2 assíncrono e `asyncpg`

**Decisão:** esqueleto em `backend/app` com `main.py`, `config.py` (pydantic-settings), `db.py` (engine assíncrono) e `routers/health.py`. A URL do banco é montada a partir de `POSTGRES_*` ou aceita `DATABASE_URL` diretamente. A verificação de saúde executa `SELECT 1`.

**Por quê:** SQLAlchemy é a base natural para os modelos de usuário, evento, favorito e avaliação previstos nos RFs seguintes; `asyncpg` combina com o modelo assíncrono do FastAPI. A montagem por variáveis separadas evita duplicar credenciais no `.env`.

**Alternativas:** `psycopg` síncrono (mais simples, mas bloqueia o event loop ou exige threadpool); acesso direto com `asyncpg` sem ORM (menos adequado à evolução do modelo de dados).

**Contrato de saúde:** `GET /health` retorna `200` com `{"status": "ok", "database": "connected"}` quando o banco responde, e `503` com `{"status": "degraded", "database": "disconnected"}` quando não responde. O endpoint nunca expõe credenciais nem detalhes internos do erro.

### 4. Front-end React 19 + Vite + Tailwind CSS 4

**Decisão:** `frontend/` com React 19, Vite e Tailwind CSS 4 via plugin `@tailwindcss/vite` (configuração CSS-first em `src/index.css`). Estrutura `src/components`, `src/assets/markers`, `src/types`.

**Por quê:** é a combinação atual e mais enxuta; o plugin elimina `tailwind.config.js` e PostCSS. React 19 é compatível com as versões atuais das bibliotecas.

**Alternativas:** Tailwind 3 com PostCSS (mais material didático disponível, porém configuração extra e versão anterior); Next.js (SSR desnecessário para uma SPA acadêmica).

### 5. Leaflet puro em vez de `react-leaflet`

**Decisão:** usar a API imperativa do Leaflet dentro de um `useEffect`, com `useRef` para o elemento e para a instância do mapa. O componente cria o mapa uma vez, sincroniza marcadores e tema em efeitos separados e chama `map.remove()` no cleanup.

**Por quê:** o requisito central é controlar `L.divIcon` e trocar tiles/filtros CSS; a API direta evita acoplamento à versão do `react-leaflet` e facilita o cleanup correto no StrictMode (efeitos executados duas vezes em desenvolvimento). Também mantém o bundle menor.

**Alternativas:** `react-leaflet` (declarativo, mas adiciona uma camada de abstração e exige cuidado com `MapContainer` recriado); `leaflet` via CDN (perde tree-shaking, tipos e testes).

### 6. Provedor de tiles e temas

**Decisão:**

| Modo | Tiles | Implementação |
| --- | --- | --- |
| `light` (padrão) | CARTO Positron | `L.tileLayer` com atribuição OSM + CARTO |
| `dark` | CARTO DarkMatter | `L.tileLayer` com atribuição OSM + CARTO |
| `thematic` | CARTO Positron | mesma camada + filtro CSS no `.leaflet-tile-pane` |

O filtro temático é aplicado por `data-theme` no contêiner do mapa: `.map-shell[data-theme="thematic"] .leaflet-tile-pane { filter: hue-rotate(200deg) saturate(1.35) contrast(1.05); }`. A troca de tema remove a camada anterior e adiciona a nova, mantendo a atribuição correta.

**Por quê:** atende ao pedido de cores editáveis sem chave de API e sem custo. O CSS filter é suficiente para o modo temático e não exige um terceiro provedor.

**Alternativas:** tiles padrão do OpenStreetMap (política de uso desencoraja tráfego de aplicação); MapTiler/Stadia (exigem chave e plano); filtro CSS em todos os modos (perde a legibilidade do DarkMatter).

**Risco de política de uso:** os basemaps CARTO gratuitos têm limites e exigem atribuição. Para produção com tráfego real, será necessário contratar um provedor ou hospedar tiles; o componente isola a URL em constante para facilitar a troca.

### 7. Marcadores SVG inline com animação e `prefers-reduced-motion`

**Decisão:** três arquivos em `frontend/src/assets/markers/` (`music.svg`, `theater.svg`, `gastronomy.svg`), importados com `?raw` do Vite e injetados no HTML do `L.divIcon`. Cada SVG tem `<style>` próprio com classes prefixadas (`ir-music-*`, `ir-theater-*`, `ir-gastronomy-*`) e um bloco `@media (prefers-reduced-motion: reduce)` que desliga as animações.

- Música: nota musical com pulso de escala e brilho.
- Teatro: duas máscaras com balanço alternado.
- Gastronomia: prato com rotação lenta e vapor com subida e fade.

O `divIcon` usa `className: "event-marker"` (fundo transparente, sem borda), `iconSize: [44, 52]` e `iconAnchor: [22, 50]`. O título do evento é escapado antes de entrar no HTML e também é exposto em `aria-label` e `title`, atendendo ao requisito de acessibilidade.

**Por quê:** SVG inline permite animação CSS sem requisições extras e sem dependência de sprite; o bloco de movimento reduzido cumpre o RNF06.

**Alternativas:** SVG como `<img>` (não permite animação CSS externa nem `currentColor`); ícones de fonte (menos controle visual); animação via JavaScript (mais custo e pior respeito à preferência do usuário).

### 8. Contrato do componente `EventMap`

```ts
type EventCategory = "musica" | "teatro" | "gastronomia";

interface MapEvent {
  id: string;
  title: string;
  category: EventCategory | string;
  latitude: number;
  longitude: number;
}

interface EventMapProps {
  events: MapEvent[];
  theme?: "light" | "dark" | "thematic";
  center?: [number, number]; // padrão: [-2.5307, -44.3068] (São Luís)
  zoom?: number;             // padrão: 13
}
```

Categorias são normalizadas (minúsculas, sem acentos) antes do mapa de ícones; valores desconhecidos usam um marcador neutro. O componente não busca dados: recebe `events` prontos, o que permite ligá-lo à API futura sem alterar o mapa.

### 9. Testes

**Decisão:** Vitest + Testing Library no front-end para funções puras (normalização de categoria, escolha do ícone, escape de HTML) e um teste de renderização que verifica a presença do contêiner e da atribuição. No back-end, `pytest` + `httpx` cobre `/health` com o banco disponível e indisponível, usando dependência substituível.

**Por quê:** valida os contratos observáveis sem exigir um navegador real; testes de tiles e animações ficam para verificação manual/visual.

## Risks / Trade-offs

- **Limite de uso dos tiles gratuitos** → manter atribuição visível, centralizar a URL dos tiles e documentar a troca de provedor para produção.
- **Filtro CSS pode reduzir contraste de rótulos** → aplicar o filtro apenas em `.leaflet-tile-pane`, nunca nos marcadores ou controles; validar visualmente nos três temas.
- **StrictMode recria efeitos em desenvolvimento** → cleanup com `map.remove()` e guarda de instância para evitar "Map container is already initialized".
- **SVGs inline com animação podem distrair** → animações lentas, respeitando `prefers-reduced-motion`, e sem animação em elementos de texto.
- **`?raw` aumenta o bundle** → os SVGs são pequenos e compartilhados; se crescerem, migrar para sprite ou componente React.
- **Versões novas de React/Vite/Tailwind** → fixar versões no `package.json` e documentar no README; o esqueleto é pequeno o bastante para ajustar rapidamente.

## Migration Plan

1. Criar a estrutura de pastas e arquivos de configuração.
2. Subir o banco isoladamente e validar o healthcheck.
3. Subir a API e confirmar `/health` conectado.
4. Subir o front-end e validar o mapa e os três marcadores.
5. Rodar os testes e o `docker compose config` para validar a composição.

Rollback: remover os arquivos e diretórios introduzidos pela mudança e executar `docker compose down -v` para descartar o volume criado. Não há dados de produção nem migrações envolvidas.

## Open Questions

- Qual será o formato definitivo dos eventos retornados pela API (nomes de campos e tipo das coordenadas)? O contrato `MapEvent` é uma suposição local e deverá ser alinhado ao schema real na mudança de CRUD de eventos.
- O projeto usará Tailwind 4 ou 3? A decisão acima assume 4; se a disciplina exigir 3, basta trocar o plugin pela configuração PostCSS sem impacto no mapa.
