# IlhaRolê — Front-end

Wireframe em React 19 + Vite + Tailwind CSS 4.

## Estado do protótipo

O front-end é um protótipo navegável com seis telas principais: feed/mapa, detalhes do evento, login/cadastro, minha agenda, área do organizador e perfil. Quando a API está disponível, feed, autenticação, perfil, favoritos, avaliações e denúncias são persistidos no PostgreSQL; se ela estiver indisponível, os dados mockados de `src/data/` mantêm o protótipo funcionando.

A tela de perfil funciona como uma central do usuário: dados pessoais, interesses culturais, preferências de alerta, agenda, avaliações, eventos publicados, denúncias e segurança. O perfil é persistido no `localStorage`; favoritos, avaliações e denúncias vivem em memória no protótipo.

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

## Telas e perfil

O roteamento é feito por hash (`#/feed`, `#/evento/:id`, `#/login`, `#/minha-agenda`, `#/organizador`, `#/perfil`). O estado principal fica em `src/App.tsx`.

A central de perfil (`src/pages/ProfilePage.tsx`) tem abas acessíveis com `role="tablist"`/`role="tab"`:

- **Meus dados:** nome, e-mail somente leitura, bairro, bio e interesses culturais.
- **Minha agenda:** favoritos em ordem cronológica.
- **Avaliações:** reviews feitos pelo usuário em eventos realizados.
- **Meus eventos:** publicações vinculadas ao `organizerId` do perfil.
- **Notificações & alertas:** preferências e histórico de avisos.
- **Denúncias:** registros enviados para moderação.
- **Segurança:** sessão simulada, alteração de senha e resumo de privacidade.

O perfil usa `src/data/mockUser.ts` como estado inicial e `localStorage` (`ilharole:profile`) para manter as edições entre recarregamentos. Em produção, essas operações devem passar pela API e pelo JWT.

## Integração com a API

O cliente HTTP fica em `src/lib/api.ts` e usa `VITE_API_URL` (padrão
`http://localhost:8000`). Quando a API está disponível:

- o feed é carregado de `GET /api/eventos`;
- login e cadastro usam `/api/auth/login` e `/api/auth/register`;
- o token JWT é persistido em `localStorage` (`ilharole:token`);
- favoritos, avaliações, denúncias, perfil, preferências e notificações usam
  as rotas `/api/me/*` e `/api/eventos/{id}/*`;
- a área do organizador publica/cancela via API.

Se a API estiver indisponível, o protótipo continua funcionando com os dados
mockados de `src/data/`. Conta de demonstração:

```text
produtor@example.com / demo1234
```

O botão “Preencher conta demo” na tela de login facilita o teste. Depois do
login, o feed recarrega com os favoritos reais do usuário.

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

### Chave da CARTO

A chave fica em `devops/.env` como `CARTO_API_KEY` e é repassada ao Vite como `VITE_CARTO_API_KEY` pelo `devops/docker-compose.yml`. O código acrescenta `?key=...` às URLs dos tiles quando a variável existe.

Como variáveis `VITE_*` são embutidas no bundle do navegador, a chave é visível para quem acessa o site. Restrinja os domínios permitidos no painel da CARTO e não use essa chave para operações sensíveis. O arquivo `devops/.env` é ignorado pelo Git.

Para um build de produção, defina `VITE_CARTO_API_KEY` no ambiente de build; sem ela, os tiles são solicitados sem chave.

## Marcadores

Os marcadores ficam em `src/assets/markers/` e são injetados como SVG inline no `L.divIcon`:

| Tier | Categoria | Arquivo | Tamanho | Animação |
| --- | --- | --- | --- | --- |
| 1 | Bumba Meu Boi | `bumba.svg` | 80×80 | Aura expansiva e fitas balançando |
| 2 | Música, reggae e shows | `reggae.svg` | 56×56 | Caixa de som com bounce e ondas sonoras |
| 2 | Tambor de Crioula | `tambor.svg` | 56×56 | Saia rodada girando (punga) e fitas tremulando |
| 2 | Samba e pagode | `samba.svg` | 56×56 | Pandeiro balançando, platinelas vibrando e notas subindo |
| 3 | Teatro | `theater.svg` | 40×40 | Máscaras flutuando e balançando |
| 3 | Gastronomia | `gastronomy.svg` | 40×40 | Vapor subindo e brilho suave |
| 3 | Orla e praia | `orla.svg` | 40×40 | Ondas deslizando e folhas do coqueiro ao vento |
| 3 | Feirinhas e artesanato | `feirinha.svg` | 40×40 | Brilhos pulsando ao redor da barraca |
| 4 | Museus e exposições | `museum.svg` | 32×32 | Fade lento de opacidade |
| 4 | Cinema e audiovisual | `cinema.svg` | 32×32 | Rolo de filme girando continuamente |
| — | Desconhecida | marcador neutro em `src/lib/markers.ts` | 44×52 | Sem animação |

Cada SVG tem um bloco `<style>` com classes prefixadas (`ir-bumba-*`, `ir-reggae-*`, `ir-teatro-*`, `ir-gastro-*`, `ir-museu-*`, `ir-tambor-*`, `ir-samba-*`, `ir-orla-*`, `ir-feira-*`, `ir-cinema-*`) e um bloco `@media (prefers-reduced-motion: reduce)` que desliga a animação. O componente `EventMap` cria os marcadores com `createEventIcon`, que usa `L.divIcon` com `className: "event-marker"` e tamanho/âncora definidos por categoria em `markerMetricsFor`.

O título e a categoria são escapados antes de entrar no HTML e expostos em `aria-label` e `title`, por exemplo: `Bumba Meu Boi na Praça — Bumba Meu Boi`. Categorias ausentes ou desconhecidas recebem o marcador neutro.

### Adicionar uma nova categoria

1. Crie o SVG em `src/assets/markers/` com classes prefixadas e o bloco de movimento reduzido.
2. Adicione a categoria em `src/types/event.ts` (`EventCategory`).
3. Importe o SVG com `?raw` em `src/lib/markers.ts` e registre-o em `CATEGORY_SVGS`, `CATEGORY_LABELS` e `MARKER_METRICS`.
4. Inclua aliases em `CATEGORY_ALIASES` de `src/lib/map.ts` e um evento de exemplo em `src/data/mockEvents.ts`.
5. Atualize os testes de `src/lib/markers.test.ts` e rode `npm test`.

## Estrutura

```text
src/
├── assets/markers/   # SVGs animados por categoria
├── components/       # EventMap, Navbar, Toast, RfBadge e Footer
├── data/             # eventos, notificações e perfil mockados
├── lib/              # helpers puros (categorias, temas, marcadores)
├── pages/            # Feed, Detalhes, Login, Agenda, Organizador e Perfil
├── test/             # configuração do Vitest
├── types/            # tipos de evento, perfil e notificações
├── App.tsx           # rotas por hash e estado principal
├── index.css
└── main.tsx
```
