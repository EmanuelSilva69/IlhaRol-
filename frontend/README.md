# IlhaRolê — Front-end

Wireframe em React 19 + Vite + Tailwind CSS 4.

## Estado do protótipo

A tela principal é um mockup preto e branco, com blocos de placeholder como “HEADER AQUI”, “Feed de eventos” e “possível local de informação”. Ela não representa o layout final.

O único componente funcional é o `EventMap`, que exibe o mapa de São Luís, os temas e os marcadores animados. O restante da interface deve ser evoluído pelas equipes de front-end.

## Executar

Com Docker (a partir da raiz do repositório):

```bash
docker compose -f devops/docker-compose.yml up -d web
```

Sem Docker:

```bash
npm install
npm run dev
```

Acesse http://localhost:5173.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Verificação TypeScript + build de produção em `dist/` |
| `npm test` | Testes unitários com Vitest |
| `npm run preview` | Pré-visualização do build de produção |

## EventMap

O componente `src/components/EventMap.tsx` usa Leaflet diretamente e recebe os eventos já carregados. Ele não busca dados.

### Props

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `events` | `MapEvent[]` | `[]` | Eventos a exibir como marcadores |
| `theme` | `"light" \| "dark" \| "thematic"` | `"light"` | Tema visual do mapa |
| `center` | `[number, number]` | `[-2.5307, -44.3068]` | Centro inicial (São Luís) |
| `zoom` | `number` | `13` | Zoom inicial |

```tsx
import EventMap from "./components/EventMap";
import type { MapEvent } from "./types/event";

const events: MapEvent[] = [
  {
    id: "show-1",
    title: "Show na Praça",
    category: "musica",
    latitude: -2.5297,
    longitude: -44.3028,
  },
];

function Pagina() {
  return (
    <EventMap
      events={events}
      theme="dark"
      center={[-2.5307, -44.3068]}
      zoom={13}
    />
  );
}
```

### Altura do contêiner

O componente aplica `min-height: 420px` e `height: 50vh` pela classe `.event-map`. Se o layout pai limitar a altura, garanta uma altura explícita no contêiner para o Leaflet calcular os tiles corretamente.

### Temas e tiles

- `light`: CARTO Positron.
- `dark`: CARTO DarkMatter.
- `thematic`: CARTO Positron com filtro CSS aplicado somente em `.leaflet-tile-pane`.

A atribuição ao OpenStreetMap e ao CARTO é exibida pelo controle do Leaflet. Os SVGs dos marcadores e os controles não recebem o filtro do modo temático.

## Marcadores

Os marcadores ficam em `src/assets/markers/` e são injetados como SVG inline no `L.divIcon`:

| Categoria | Arquivo | Animação |
| --- | --- | --- |
| Música | `music.svg` | Nota musical pulsando |
| Teatro | `theater.svg` | Máscaras balançando em sentidos opostos |
| Gastronomia | `gastronomy.svg` | Prato girando e vapor subindo |
| Desconhecida | marcador neutro em `src/lib/markers.ts` | Sem animação |

Cada SVG tem um bloco `<style>` com classes prefixadas (`ir-music-*`, `ir-theater-*`, `ir-gastronomy-*`) e um bloco `@media (prefers-reduced-motion: reduce)` que desliga a animação. O componente `EventMap` cria os marcadores com `createEventIcon`, que usa `L.divIcon` com `iconSize: [44, 52]`, `iconAnchor: [22, 50]` e `className: "event-marker"`.

O título e a categoria são escapados antes de entrar no HTML e expostos em `aria-label` e `title`, por exemplo: `Show na Praça — Música`. Categorias ausentes ou desconhecidas recebem o marcador neutro.

### Adicionar uma nova categoria

1. Crie o SVG em `src/assets/markers/` com classes prefixadas e o bloco de movimento reduzido.
2. Adicione a categoria em `src/types/event.ts` (`EventCategory`).
3. Importe o SVG com `?raw` em `src/lib/markers.ts` e registre-o em `CATEGORY_SVGS` e `CATEGORY_LABELS`.
4. Inclua um evento de exemplo em `src/App.tsx` e atualize os testes de `src/lib/markers.test.ts`.
5. Rode `npm test` e verifique o marcador no mapa.

## Estrutura

```text
src/
├── assets/markers/   # SVGs animados por categoria
├── components/       # EventMap e estilos
├── lib/              # helpers puros (categorias, temas, marcadores)
├── test/             # configuração do Vitest
├── types/            # tipos de evento
├── App.tsx           # wireframe da tela principal
├── index.css
└── main.tsx
```
