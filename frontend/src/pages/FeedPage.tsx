import { useState } from "react";
import EventMap from "../components/EventMap";
import RfBadge from "../components/RfBadge";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import { normalizeCategory } from "../lib/map";
import { categoryLabel } from "../lib/markers";
import type { CulturalEvent, MapTheme } from "../types/event";

interface FeedPageProps {
  events: CulturalEvent[];
  onToggleFavorite: (eventId: string) => void;
}

const THEMES: Array<{ value: MapTheme; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "thematic", label: "Temático" },
];

export function FeedPage({ events, onToggleFavorite }: FeedPageProps) {
  const [theme, setTheme] = useState<MapTheme>("light");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("TODOS");
  const [selectedCategory, setSelectedCategory] = useState("TODAS");
  const [selectedPeriod, setSelectedPeriod] = useState("TODOS");
  const [simulateEmptyState, setSimulateEmptyState] = useState(false);

  const filteredEvents = simulateEmptyState
    ? []
    : events.filter((event) => {
        const matchesQuery =
          !searchQuery.trim() ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesNeighborhood =
          selectedNeighborhood === "TODOS" ||
          event.neighborhood === selectedNeighborhood;

        const matchesCategory =
          selectedCategory === "TODAS" ||
          normalizeCategory(event.category) === selectedCategory;

        const matchesPeriod =
          selectedPeriod === "TODOS" ||
          (selectedPeriod === "FIM_DE_SEMANA" &&
            (event.date === "2026-11-21" ||
              event.date === "2026-11-22" ||
              event.date === "2026-11-28" ||
              event.date === "2026-11-29")) ||
          (selectedPeriod === "PASSADOS" && event.status === "REALIZADO");

        return (
          matchesQuery &&
          matchesNeighborhood &&
          matchesCategory &&
          matchesPeriod
        );
      });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedNeighborhood("TODOS");
    setSelectedCategory("TODAS");
    setSelectedPeriod("TODOS");
    setSimulateEmptyState(false);
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 1"
        screenTitle="Explorar Feed Cultural, Filtros Simultâneos e Mapa Interativo"
        rfs={["RF03", "RF04", "RF05"]}
        rnfs={["RNF01", "RNF02", "RNF06"]}
        userStories={["US02", "US03", "US04"]}
        description="Apresenta o feed unificado de eventos de São Luís com busca textual por palavra-chave e filtros combinados por bairro, categoria (Bumba Meu Boi, Música/Reggae, Teatro, Gastronomia, Museus, Tambor de Crioula, Samba/Pagode, Orla/Praia, Feirinhas/Artesanato e Cinema/Audiovisual) e período, sincronizados com o mapa interativo Leaflet e botão rápido de 'Tenho interesse' (Fluxo 1 e Fluxo 3)."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside
          aria-label="Filtros de busca de eventos"
          className="border-2 border-black bg-white p-4 self-start"
        >
          <div className="flex items-center justify-between border-b border-black pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest">
              Filtros Combinados (RF03)
            </h3>
            <button
              type="button"
              onClick={handleResetFilters}
              className="cursor-pointer text-[11px] font-bold underline hover:text-neutral-600"
            >
              Limpar
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="filter-search"
                className="block text-xs font-bold uppercase"
              >
                Busca por palavra-chave
              </label>
              <input
                id="filter-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex.: Samba, Tambor, Teatro..."
                className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black"
              />
            </div>

            <div>
              <label
                htmlFor="filter-neighborhood"
                className="block text-xs font-bold uppercase"
              >
                Bairro de São Luís
              </label>
              <select
                id="filter-neighborhood"
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="TODOS">Todos os bairros</option>
                {SAO_LUIS_NEIGHBORHOODS.map((bairro) => (
                  <option key={bairro} value={bairro}>
                    {bairro}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-category"
                className="block text-xs font-bold uppercase"
              >
                Categoria Cultural
              </label>
              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="TODAS">Todas as categorias</option>
                <option value="bumba">Bumba Meu Boi</option>
                <option value="musica">Música, reggae e shows</option>
                <option value="teatro">Teatro</option>
                <option value="gastronomia">Gastronomia</option>
                <option value="museu">Museus e exposições</option>
                <option value="tambor">Tambor de Crioula</option>
                <option value="samba">Samba e pagode</option>
                <option value="orla">Orla e praia</option>
                <option value="feirinha">Feirinhas e artesanato</option>
                <option value="cinema">Cinema e audiovisual</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-period"
                className="block text-xs font-bold uppercase"
              >
                Período / Data
              </label>
              <select
                id="filter-period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="TODOS">Qualquer data</option>
                <option value="FIM_DE_SEMANA">Este fim de semana</option>
                <option value="PASSADOS">Eventos já realizados (RF06)</option>
              </select>
            </div>

            <div className="border-t border-dashed border-black pt-3">
              <p className="text-[11px] font-bold uppercase text-neutral-700">
                Estados de Teste do Protótipo:
              </p>
              <button
                type="button"
                onClick={() => setSimulateEmptyState((prev) => !prev)}
                aria-pressed={simulateEmptyState}
                className={`mt-2 w-full cursor-pointer border-2 border-black px-3 py-2 text-xs font-black uppercase ${
                  simulateEmptyState
                    ? "bg-amber-300 text-black"
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
                }`}
              >
                {simulateEmptyState
                  ? "Restaurar Lista de Eventos"
                  : "Simular Busca Sem Resultados (RF03)"}
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="border-2 border-black bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest">
                  Mapa Geográfico de Eventos em São Luís (RF04)
                </h2>
                <p className="mt-1 text-xs text-neutral-600">
                  Exibindo {filteredEvents.length} marcador(es) animado(s) por
                  categoria cultural
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
                    className={`cursor-pointer border border-black px-2.5 py-1 text-xs font-bold uppercase ${
                      theme === value
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <EventMap events={filteredEvents} theme={theme} />
            </div>
          </div>

          <div className="border-2 border-black bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Feed de Eventos Encontrados ({filteredEvents.length})
                </h2>
                <p className="text-xs text-neutral-600">
                  Clique em &ldquo;Ver detalhes&rdquo; para abrir a ficha completa ou salve na sua agenda pessoal
                </p>
              </div>
              <span className="border border-black bg-neutral-100 px-2.5 py-1 text-[11px] font-bold uppercase">
                Ordenado por data mais próxima
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div
                role="status"
                className="my-6 border-2 border-dashed border-black bg-neutral-50 p-8 text-center"
              >
                <p className="text-base font-black uppercase text-black">
                  Nenhum evento corresponde aos filtros aplicados
                </p>
                <p className="mt-2 text-xs text-neutral-700">
                  Critério de aceite do RF03 (Fluxo 1 — Caminho Alternativo A):
                  ajuste o termo de busca, selecione outro bairro de São Luís ou
                  limpe os filtros.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase text-white hover:bg-neutral-800"
                >
                  Mostrar todos os eventos
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {filteredEvents.map((event) => (
                  <article
                    key={event.id}
                    className="flex flex-col justify-between border-2 border-black bg-white p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="border border-black bg-neutral-100 px-2 py-0.5 text-[11px] font-black uppercase">
                          {categoryLabel(event.category)} · {event.neighborhood}
                        </span>
                        <span
                          className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            event.status === "CANCELADO"
                              ? "bg-red-200 text-red-950"
                              : event.status === "REALIZADO"
                                ? "bg-neutral-200 text-neutral-800"
                                : "bg-emerald-200 text-emerald-950"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-black leading-snug">
                        <a
                          href={`#/evento/${event.id}`}
                          className="hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-black"
                        >
                          {event.title}
                        </a>
                      </h3>

                      <p className="mt-1.5 text-xs text-neutral-700 line-clamp-2">
                        {event.description}
                      </p>

                      <dl className="mt-3 space-y-1 text-xs text-neutral-800">
                        <div>
                          <dt className="inline font-bold">Data e Horário: </dt>
                          <dd className="inline">
                            {event.date} · {event.time}
                          </dd>
                        </div>
                        <div>
                          <dt className="inline font-bold">Local: </dt>
                          <dd className="inline">{event.location}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3">
                      <a
                        href={`#/evento/${event.id}`}
                        className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-black hover:bg-neutral-100"
                      >
                        Ver detalhes (RF04)
                      </a>

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(event.id)}
                        aria-pressed={event.isFavorite}
                        className={`cursor-pointer border-2 border-black px-3 py-1.5 text-xs font-black uppercase ${
                          event.isFavorite
                            ? "bg-black text-white"
                            : "bg-amber-100 text-black hover:bg-amber-200"
                        }`}
                      >
                        {event.isFavorite
                          ? "★ Salvo na Agenda (RF05)"
                          : "☆ Tenho interesse (RF05)"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default FeedPage;