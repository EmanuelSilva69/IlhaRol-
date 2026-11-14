import { useState } from "react";

import EventMap from "./components/EventMap";
import type { MapEvent, MapTheme } from "./types/event";

const THEMES: Array<{ value: MapTheme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "thematic", label: "Temático" },
];

const SAMPLE_EVENTS: MapEvent[] = [
  {
    id: "bumba-1",
    title: "Bumba Meu Boi no Largo da Madre Deus",
    category: "bumba",
    latitude: -2.5249,
    longitude: -44.2994,
  },
  {
    id: "musica-1",
    title: "Reggae no Centro",
    category: "musica",
    latitude: -2.535,
    longitude: -44.296,
  },
  {
    id: "teatro-1",
    title: "Peça no Teatro Arthur Azevedo",
    category: "teatro",
    latitude: -2.5318,
    longitude: -44.2989,
  },
  {
    id: "gastronomia-1",
    title: "Feira Gastronômica na Ponta d'Areia",
    category: "gastronomia",
    latitude: -2.5021,
    longitude: -44.3164,
  },
  {
    id: "museu-1",
    title: "Museu Histórico",
    category: "museu",
    latitude: -2.531,
    longitude: -44.302,
  },
  {
    id: "tambor-1",
    title: "Tambor de Crioula na Praça Nauro Machado",
    category: "tambor",
    latitude: -2.5293,
    longitude: -44.3022,
  },
  {
    id: "samba-1",
    title: "Roda de Samba no Apicum",
    category: "samba",
    latitude: -2.529,
    longitude: -44.303,
  },
  {
    id: "orla-1",
    title: "Pôr do Sol no Espigão Costeiro",
    category: "orla",
    latitude: -2.505,
    longitude: -44.313,
  },
  {
    id: "feirinha-1",
    title: "Feirinha de Artesanato da Praia Grande",
    category: "feirinha",
    latitude: -2.5288,
    longitude: -44.3048,
  },
  {
    id: "cinema-1",
    title: "Mostra de Cinema Ludovicense",
    category: "cinema",
    latitude: -2.5295,
    longitude: -44.3035,
  },
  {
    id: "outro-1",
    title: "Evento especial",
    category: "literatura",
    latitude: -2.545,
    longitude: -44.3,
  },
];

const FILTERS = ["Busca", "Data", "Bairro", "Categoria"];
const NAV_ITEMS = ["Feed", "Mapa", "Agenda", "Perfil"];
const PLACEHOLDER_CARDS = [1, 2, 3, 4];

function App() {
  const [theme, setTheme] = useState<MapTheme>("light");

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="border-b border-black bg-neutral-100 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[0.3em]">
        Protótipo — sem dados reais
      </div>

      <header className="border-b-2 border-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
              IlhaRolê · São Luís
            </p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-tight">
              Header aqui
            </h1>
            <p className="mt-1 text-[11px] uppercase text-neutral-500">
              Possível local de informação
            </p>
          </div>

          <nav
            aria-label="Navegação principal"
            className="flex flex-wrap gap-2 text-[10px] font-bold uppercase"
          >
            {NAV_ITEMS.map((item) => (
              <span key={item} className="border border-black px-3 py-1">
                {item}
              </span>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="border-2 border-dashed border-black p-4">
          <h2 className="text-xs font-black uppercase tracking-widest">
            Filtros
          </h2>
          <p className="mt-1 text-[10px] uppercase text-neutral-500">
            Possível local de informação
          </p>

          <div className="mt-4 space-y-3">
            {FILTERS.map((filter) => (
              <div key={filter}>
                <p className="text-[10px] font-bold uppercase">{filter}</p>
                <div className="mt-1 h-8 border border-black bg-neutral-100" />
              </div>
            ))}
          </div>

          <div className="mt-4 h-8 border border-black bg-black" />
        </aside>

        <section className="space-y-6">
          <div className="border-2 border-dashed border-black p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest">
                  Mapa de eventos
                </h2>
                <p className="mt-1 text-[10px] uppercase text-neutral-500">
                  Componente EventMap — protótipo funcional
                </p>
              </div>

              <div
                className="flex gap-1"
                role="group"
                aria-label="Tema do mapa"
              >
                {THEMES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={theme === value}
                    className={`border border-black px-2 py-1 text-[10px] font-bold uppercase ${
                      theme === value
                        ? "bg-black text-white"
                        : "bg-white text-black"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <EventMap events={SAMPLE_EVENTS} theme={theme} />
            </div>
          </div>

          <div className="border-2 border-dashed border-black p-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest">
                  Feed de eventos
                </h2>
                <p className="mt-1 text-[10px] uppercase text-neutral-500">
                  Possível local de informação
                </p>
              </div>
              <span className="border border-black px-2 py-1 text-[10px] font-bold uppercase">
                Ordenar
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {PLACEHOLDER_CARDS.map((card) => (
                <article key={card} className="border border-black p-3">
                  <div className="flex h-24 items-center justify-center border border-dashed border-neutral-400 bg-neutral-100 text-[10px] font-bold uppercase text-neutral-400">
                    Imagem do evento
                  </div>
                  <div className="mt-3 h-3 w-3/4 bg-neutral-300" />
                  <div className="mt-2 h-3 w-1/2 bg-neutral-200" />
                  <p className="mt-3 text-[10px] uppercase text-neutral-500">
                    Possível local de informação
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t-2 border-black bg-neutral-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[10px] font-bold uppercase text-neutral-500 sm:flex-row sm:justify-between">
          <span>Footer aqui</span>
          <span>Possível local de informação</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
