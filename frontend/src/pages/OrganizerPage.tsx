import { type FormEvent, useCallback, useState } from "react";

import RfBadge from "../components/RfBadge";
import Toast from "../components/Toast";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import { categoryLabel } from "../lib/markers";
import type {
  CulturalEvent,
  EventCategory,
  NewEventInput,
} from "../types/event";

interface OrganizerPageProps {
  events: CulturalEvent[];
  onCancelEvent: (eventId: string) => void;
  onPublishEvent: (input: NewEventInput) => void;
}

const CATEGORY_OPTIONS: Array<{ value: EventCategory; label: string }> = [
  { value: "bumba", label: "Bumba Meu Boi" },
  { value: "musica", label: "Música, reggae e shows" },
  { value: "teatro", label: "Teatro" },
  { value: "gastronomia", label: "Gastronomia" },
  { value: "museu", label: "Museus e exposições" },
  { value: "tambor", label: "Tambor de Crioula" },
  { value: "samba", label: "Samba e pagode" },
  { value: "orla", label: "Orla e praia" },
  { value: "feirinha", label: "Feirinhas e artesanato" },
  { value: "cinema", label: "Cinema e audiovisual" },
];

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80";

export function OrganizerPage({
  events,
  onCancelEvent,
  onPublishEvent,
}: OrganizerPageProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory>("bumba");
  const [date, setDate] = useState("2026-12-05");
  const [time, setTime] = useState("18:00 às 22:00");
  const [location, setLocation] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(
    SAO_LUIS_NEIGHBORHOODS[0],
  );
  const [bannerUrl, setBannerUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const myEvents = events.filter((event) => event.organizerId === "org-carlos");

  const handlePublish = (formEvent: FormEvent) => {
    formEvent.preventDefault();

    if (!title.trim() || !description.trim() || !location.trim()) {
      setFeedback(
        "Preencha título, descrição e local para publicar. O sistema vincula o evento ao organizador autenticado (RF02).",
      );
      return;
    }

    if (new Date(`${date}T23:59:59`) <= new Date()) {
      setFeedback(
        "A data e o horário precisam ser futuros. Cadastros com datas passadas são rejeitados (RF02).",
      );
      return;
    }

    onPublishEvent({
      title: title.trim(),
      description: description.trim(),
      category,
      date,
      time,
      location: location.trim(),
      neighborhood,
      bannerUrl: bannerUrl.trim() || DEFAULT_BANNER,
    });

    setTitle("");
    setDescription("");
    setLocation("");
    setBannerUrl("");
    setFeedback(
      "Evento publicado com sucesso e vinculado ao seu perfil de organizador (RF02).",
    );
    setToast("Evento publicado com sucesso (RF02)");
  };

  const handleCancel = (eventId: string) => {
    onCancelEvent(eventId);
    setEventFeedback(
      "Publicação marcada como CANCELADA. A ficha continua disponível e os usuários que favoritaram recebem aviso (RF07 / RF11).",
    );
    setToast("Publicação cancelada (RF07 / RF11)");
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 5"
        screenTitle="Área do Organizador — Publicar e Gerenciar Eventos"
        rfs={["RF02", "RF07", "RF11"]}
        rnfs={["RNF03", "RNF05", "RNF06"]}
        userStories={["US02", "US08"]}
        description="Permite publicar um evento com dados completos, validar data futura e acompanhar as próprias publicações. O organizador pode editar ou cancelar seus eventos; o cancelamento preserva a ficha e dispara aviso aos favoritos."
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="border-2 border-black bg-white p-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black uppercase tracking-wide">
              Publicar novo evento (RF02)
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              Todos os campos abaixo compõem a publicação exibida no feed e no
              mapa.
            </p>
          </div>

          <form onSubmit={handlePublish} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="event-title"
                className="block text-xs font-bold uppercase"
              >
                Título do evento
              </label>
              <input
                id="event-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Roda de Tambor de Crioula na Praça"
                className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="event-description"
                className="block text-xs font-bold uppercase"
              >
                Descrição
              </label>
              <textarea
                id="event-description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Atrações, público e informações de acesso..."
                className="mt-1 w-full border-2 border-black p-2 text-xs"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="event-category"
                  className="block text-xs font-bold uppercase"
                >
                  Categoria
                </label>
                <select
                  id="event-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as EventCategory)
                  }
                  className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="event-neighborhood"
                  className="block text-xs font-bold uppercase"
                >
                  Bairro
                </label>
                <select
                  id="event-neighborhood"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                >
                  {SAO_LUIS_NEIGHBORHOODS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="event-date"
                  className="block text-xs font-bold uppercase"
                >
                  Data (futura)
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="event-time"
                  className="block text-xs font-bold uppercase"
                >
                  Horário
                </label>
                <input
                  id="event-time"
                  type="text"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="event-location"
                className="block text-xs font-bold uppercase"
              >
                Local / endereço
              </label>
              <input
                id="event-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Praça, teatro ou espaço cultural"
                className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="event-banner"
                className="block text-xs font-bold uppercase"
              >
                URL do banner (opcional)
              </label>
              <input
                id="event-banner"
                type="url"
                value={bannerUrl}
                onChange={(event) => setBannerUrl(event.target.value)}
                placeholder="https://..."
                className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
            >
              Publicar evento (RF02)
            </button>
          </form>

          {feedback && (
            <p
              role="status"
              className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
            >
              {feedback}
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="border-2 border-black bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-black pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide">
                  Minhas publicações ({myEvents.length})
                </h2>
                <p className="text-xs text-neutral-600">
                  Somente o criador pode editar ou cancelar os próprios eventos
                  (RF07).
                </p>
              </div>
              <span className="border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                Organizador: Carlos
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {myEvents.map((event) => (
                <article
                  key={event.id}
                  className="border border-black bg-neutral-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase text-neutral-600">
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

                  <h3 className="mt-1 text-sm font-black leading-snug">
                    {event.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-neutral-700">
                    {categoryLabel(event.category)} · {event.neighborhood}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={`#/evento/${event.id}`}
                      className="border border-black bg-white px-2 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                    >
                      Ver ficha
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setEventFeedback(
                          `Edição simulada de “${event.title}”. A alteração de data, horário ou local dispara aviso aos favoritos (RF07 / RF11).`,
                        )
                      }
                      className="cursor-pointer border border-black bg-white px-2 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                    >
                      Editar (RF07)
                    </button>
                    <button
                      type="button"
                      disabled={event.status === "CANCELADO"}
                      onClick={() => handleCancel(event.id)}
                      className="cursor-pointer border border-black bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-950 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {event.status === "CANCELADO"
                        ? "Cancelado"
                        : "Cancelar (RF07)"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {eventFeedback && (
              <p
                role="status"
                className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
              >
                {eventFeedback}
              </p>
            )}
          </div>

          <div className="border-2 border-dashed border-black p-4 text-xs text-neutral-700">
            <h2 className="text-xs font-black uppercase text-black">
              Avisos automáticos (RF11)
            </h2>
            <p className="mt-2">
              Ao alterar data, horário ou local, ou ao cancelar uma publicação,
              todos os usuários que favoritaram o evento recebem uma notificação
              com acesso à ficha atualizada.
            </p>
            <a
              href="#/minha-agenda"
              className="mt-2 inline-block border border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase hover:bg-neutral-100"
            >
              Ver avisos na Minha Agenda
            </a>
          </div>
        </section>
      </div>

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default OrganizerPage;
