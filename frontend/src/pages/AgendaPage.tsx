import RfBadge from "../components/RfBadge";
import { categoryLabel } from "../lib/markers";
import type { CulturalEvent, UserNotification } from "../types/event";

interface AgendaPageProps {
  events: CulturalEvent[];
  notifications: UserNotification[];
  onToggleFavorite: (eventId: string) => void;
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function AgendaPage({
  events,
  notifications,
  onToggleFavorite,
}: AgendaPageProps) {
  const favoriteEvents = events
    .filter((event) => event.isFavorite)
    .sort((a, b) => a.date.localeCompare(b.date));

  const unreadAlerts = notifications.filter((notification) => !notification.read);

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 4"
        screenTitle="Minha Agenda Pessoal e Avisos de Alteração"
        rfs={["RF05", "RF10", "RF11"]}
        rnfs={["RNF05", "RNF06"]}
        userStories={["US04", "US05", "US07"]}
        description="Consolida os eventos salvos com 'Tenho interesse', organizados por data, com acesso à ficha completa e remoção do vínculo. Exibe também os avisos de alteração ou cancelamento enviados aos favoritos."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="border-2 border-black bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-black pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide">
                Eventos salvos ({favoriteEvents.length})
              </h2>
              <p className="text-xs text-neutral-600">
                Lista consolidada por data, com situação atualizada do evento
                (RF10).
              </p>
            </div>
            <a
              href="#/feed"
              className="border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-neutral-800"
            >
              + Explorar mais eventos
            </a>
          </div>

          {favoriteEvents.length === 0 ? (
            <div
              role="status"
              className="mt-5 border-2 border-dashed border-black bg-neutral-50 p-8 text-center"
            >
              <p className="text-base font-black uppercase">
                Sua agenda está vazia
              </p>
              <p className="mt-2 text-xs text-neutral-700">
                Use o botão “Tenho interesse” no feed ou na ficha de um evento
                para adicioná-lo aqui (RF05 / RF10).
              </p>
              <a
                href="#/feed"
                className="mt-4 inline-block border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
              >
                Ir para o feed
              </a>
            </div>
          ) : (
            <ol className="mt-4 space-y-3">
              {favoriteEvents.map((event) => (
                <li
                  key={event.id}
                  className="border-2 border-black bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="border border-black bg-neutral-100 px-2 py-0.5 text-[11px] font-black uppercase">
                      {formatDate(event.date)} · {event.time}
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

                  <h3 className="mt-2 text-base font-black leading-snug">
                    <a
                      href={`#/evento/${event.id}`}
                      className="hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-black"
                    >
                      {event.title}
                    </a>
                  </h3>

                  <p className="mt-1 text-xs text-neutral-700">
                    {categoryLabel(event.category)} · {event.location} ·{" "}
                    {event.neighborhood}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`#/evento/${event.id}`}
                      className="border border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase hover:bg-neutral-100"
                    >
                      Ver detalhes
                    </a>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(event.id)}
                      className="cursor-pointer border border-black bg-red-100 px-3 py-1.5 text-[11px] font-black uppercase text-red-950 hover:bg-red-200"
                    >
                      Remover da agenda (RF05)
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-4">
          <section className="border-2 border-black bg-amber-50 p-4">
            <div className="flex items-center justify-between border-b border-black pb-2">
              <h2 className="text-xs font-black uppercase tracking-widest">
                Avisos de atualização
              </h2>
              <span className="border border-black bg-black px-2 py-0.5 text-[10px] font-black text-white">
                {unreadAlerts.length} não lidos
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`border border-black p-2.5 text-xs ${
                    notification.read ? "bg-white" : "bg-amber-100"
                  }`}
                >
                  <p className="font-black uppercase text-[10px]">
                    {notification.type === "CANCELAMENTO_EVENTO"
                      ? "Cancelamento"
                      : notification.type === "ALTERACAO_EVENTO"
                        ? "Alteração"
                        : "Novo evento compatível"}
                  </p>
                  <p className="mt-0.5 font-bold">{notification.eventTitle}</p>
                  <p className="mt-1 text-neutral-700">{notification.content}</p>
                  <a
                    href={`#/evento/${notification.eventId}`}
                    className="mt-1.5 inline-block text-[11px] font-black underline"
                  >
                    Abrir detalhes do evento (RF11)
                  </a>
                </article>
              ))}
            </div>

            <a
              href="#/perfil"
              className="mt-3 block border border-black bg-white px-3 py-1.5 text-center text-[11px] font-black uppercase hover:bg-neutral-100"
            >
              Configurar preferências de alerta (RF12)
            </a>
          </section>

          <section className="border-2 border-dashed border-black p-4 text-xs text-neutral-700">
            <h2 className="text-xs font-black uppercase text-black">
              Regras da agenda
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Um único vínculo de interesse por usuário e evento.</li>
              <li>Remover o interesse não apaga o evento nem os favoritos de outras pessoas.</li>
              <li>Eventos cancelados permanecem visíveis com o aviso de situação.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default AgendaPage;
