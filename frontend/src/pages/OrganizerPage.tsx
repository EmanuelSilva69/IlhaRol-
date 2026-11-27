import { type FormEvent, useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";

import RfBadge from "../components/RfBadge";
import Toast from "../components/Toast";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import { categoryLabel } from "../lib/markers";
import type {
  CulturalEvent,
  EventCategory,
  NewEventInput,
} from "../types/event";

export type EventsStatus = "loading" | "ready" | "error";

interface OrganizerPageProps {
  events: CulturalEvent[];
  eventsStatus: EventsStatus;
  onRetryEvents: () => void;
  organizerId: string;
  organizerName: string;
  onCancelEvent: (eventId: string) => void;
  onPublishEvent: (input: NewEventInput) => Promise<void>;
}

type RequiredField = "title" | "description" | "date" | "location";
type FieldError = "missing" | "past";

// Ordem em que os campos aparecem no formulário (define o primeiro inválido).
const REQUIRED_FIELDS: RequiredField[] = [
  "title",
  "description",
  "date",
  "location",
];

const FIELD_IDS: Record<RequiredField, string> = {
  title: "event-title",
  description: "event-description",
  date: "event-date",
  location: "event-location",
};

const FIELD_LABELS: Record<RequiredField, string> = {
  title: "Título do evento",
  description: "Descrição",
  date: "Data",
  location: "Local",
};

const MISSING_HINTS: Record<RequiredField, string> = {
  title: "Informe o título do evento.",
  description: "Informe a descrição do evento.",
  date: "Informe a data do evento.",
  location: "Informe o local do evento.",
};

const PUBLISH_ERROR =
  "Não foi possível publicar agora. Seu evento não foi salvo; tente de novo.";

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
  eventsStatus,
  onRetryEvents,
  organizerId,
  organizerName,
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<RequiredField, FieldError>>
  >({});
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const [pendingCancel, setPendingCancel] = useState<CulturalEvent | null>(
    null,
  );
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const keepEventButtonRef = useRef<HTMLButtonElement>(null);
  const cancelOpenerRef = useRef<HTMLButtonElement | null>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const myEvents = events
    .filter((event) => event.organizerId === organizerId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const missingLabels = REQUIRED_FIELDS.filter(
    (field) => fieldErrors[field] === "missing",
  ).map((field) => FIELD_LABELS[field]);
  const validationSummary = [
    missingLabels.length > 0
      ? `Faltou preencher: ${joinWithAnd(missingLabels)}.`
      : "",
    fieldErrors.date === "past" ? "A data precisa ser futura." : "",
  ]
    .filter(Boolean)
    .join(" ");
  const formAlert = validationSummary || publishError;

  const clearFieldError = (field: RequiredField) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const fieldA11y = (field: RequiredField) =>
    fieldErrors[field]
      ? {
          "aria-invalid": true as const,
          "aria-describedby": `${FIELD_IDS[field]}-error`,
        }
      : {};

  const fieldBorder = (field: RequiredField) =>
    fieldErrors[field] ? "border-[#b91c1c]" : "border-black";

  const fieldHint = (field: RequiredField) => {
    const error = fieldErrors[field];
    if (!error) {
      return null;
    }

    return (
      <p
        id={`${FIELD_IDS[field]}-error`}
        className="mt-1 text-[11px] font-bold text-[#b91c1c]"
      >
        {error === "past" ? "Escolha uma data futura." : MISSING_HINTS[field]}
      </p>
    );
  };

  const validate = (): Partial<Record<RequiredField, FieldError>> => {
    const errors: Partial<Record<RequiredField, FieldError>> = {};
    if (!title.trim()) errors.title = "missing";
    if (!description.trim()) errors.description = "missing";
    if (!date) {
      errors.date = "missing";
    } else if (new Date(`${date}T23:59:59`) <= new Date()) {
      errors.date = "past";
    }
    if (!location.trim()) errors.location = "missing";
    return errors;
  };

  const handlePublish = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (isPublishing) {
      return;
    }

    const errors = validate();
    const firstInvalid = REQUIRED_FIELDS.find((field) => errors[field]);

    // Renderiza aria-invalid/aria-describedby antes de mover o foco.
    flushSync(() => {
      setFieldErrors(errors);
      setPublishError(null);
      setFeedback(null);
    });

    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    setIsPublishing(true);
    try {
      await onPublishEvent({
        title: title.trim(),
        description: description.trim(),
        category,
        date,
        time,
        location: location.trim(),
        neighborhood,
        bannerUrl: bannerUrl.trim() || DEFAULT_BANNER,
      });
    } catch {
      setPublishError(PUBLISH_ERROR);
      return;
    } finally {
      setIsPublishing(false);
    }

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

  const openCancelDialog = (
    event: CulturalEvent,
    opener: HTMLButtonElement,
  ) => {
    cancelOpenerRef.current = opener;
    flushSync(() => setPendingCancel(event));
    cancelDialogRef.current?.showModal();
    keepEventButtonRef.current?.focus();
  };

  const closeCancelDialog = () => cancelDialogRef.current?.close();

  // Dispara tanto no Esc quanto nos dois botões do diálogo.
  const handleCancelDialogClose = () => {
    setPendingCancel(null);
    cancelOpenerRef.current?.focus();
  };

  const confirmCancel = () => {
    if (pendingCancel) {
      handleCancel(pendingCancel.id);
    }
    closeCancelDialog();
  };

  const retryEvents = () => {
    onRetryEvents();
    listHeadingRef.current?.focus();
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

          <form
            noValidate
            onSubmit={(formEvent) => void handlePublish(formEvent)}
            className="mt-4 space-y-3"
          >
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
                required
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearFieldError("title");
                }}
                placeholder="Ex.: Roda de Tambor de Crioula na Praça"
                {...fieldA11y("title")}
                className={`mt-1 w-full border-2 px-3 py-1.5 text-xs placeholder:text-neutral-500 ${fieldBorder("title")}`}
              />
              {fieldHint("title")}
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
                required
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFieldError("description");
                }}
                placeholder="Atrações, público e informações de acesso..."
                {...fieldA11y("description")}
                className={`mt-1 w-full border-2 p-2 text-xs placeholder:text-neutral-500 ${fieldBorder("description")}`}
              />
              {fieldHint("description")}
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
                  onChange={(event) => {
                    setDate(event.target.value);
                    clearFieldError("date");
                  }}
                  {...fieldA11y("date")}
                  className={`mt-1 w-full border-2 px-3 py-1.5 text-xs ${fieldBorder("date")}`}
                />
                {fieldHint("date")}
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
                required
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  clearFieldError("location");
                }}
                placeholder="Praça, teatro ou espaço cultural"
                {...fieldA11y("location")}
                className={`mt-1 w-full border-2 px-3 py-1.5 text-xs placeholder:text-neutral-500 ${fieldBorder("location")}`}
              />
              {fieldHint("location")}
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
                className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs placeholder:text-neutral-500"
              />
            </div>

            {formAlert && (
              <p
                role="alert"
                className="border-2 border-[#b91c1c] bg-[#fef2f2] p-2 text-xs font-bold text-neutral-900"
              >
                {formAlert}
              </p>
            )}

            <button
              type="submit"
              className="w-full cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
            >
              {isPublishing ? "Publicando..." : "Publicar evento (RF02)"}
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
                <h2
                  ref={listHeadingRef}
                  tabIndex={-1}
                  className="text-sm font-black uppercase tracking-wide"
                >
                  Minhas publicações
                  {eventsStatus === "ready" && ` (${myEvents.length})`}
                </h2>
                <p className="text-xs text-neutral-600">
                  Somente o criador pode editar ou cancelar os próprios eventos
                  (RF07).
                </p>
              </div>
              <span className="border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                Organizador: {organizerName}
              </span>
            </div>

            {eventsStatus === "loading" && (
              <p role="status" className="mt-3 text-xs text-neutral-700">
                Carregando suas publicações...
              </p>
            )}

            {eventsStatus === "error" && (
              <div className="mt-3 border-2 border-[#b91c1c] bg-[#fef2f2] p-3">
                <p role="alert" className="text-xs font-bold text-neutral-900">
                  Não foi possível carregar suas publicações. Verifique a
                  conexão.
                </p>
                <button
                  type="button"
                  onClick={retryEvents}
                  className="mt-2 cursor-pointer border border-black bg-white px-2 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                >
                  Tentar de novo
                </button>
              </div>
            )}

            {eventsStatus === "ready" && myEvents.length === 0 && (
              <div className="mt-3 border border-dashed border-black p-3">
                <p className="text-xs text-neutral-700">
                  Você ainda não publicou nenhum evento.
                </p>
                <button
                  type="button"
                  onClick={() => document.getElementById("event-title")?.focus()}
                  className="mt-2 cursor-pointer border border-black bg-white px-2 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                >
                  Publicar meu primeiro evento
                </button>
              </div>
            )}

            {eventsStatus === "ready" && myEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                {myEvents.map((event) => {
                  const isCancelled = event.status === "CANCELADO";

                  return (
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
                            isCancelled
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
                          aria-disabled={isCancelled}
                          onClick={(clickEvent) => {
                            if (!isCancelled) {
                              openCancelDialog(event, clickEvent.currentTarget);
                            }
                          }}
                          className="cursor-pointer border border-black bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-950 hover:bg-red-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                        >
                          {isCancelled ? "Cancelado" : "Cancelar (RF07)"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

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

      <dialog
        ref={cancelDialogRef}
        onClose={handleCancelDialogClose}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
        className="m-auto w-[min(26rem,calc(100%-2rem))] border-2 border-black bg-white p-5 text-black backdrop:bg-black/50"
      >
        <h2 id="cancel-dialog-title" className="text-sm font-black">
          Cancelar '{pendingCancel?.title}'?
        </h2>
        <p id="cancel-dialog-description" className="mt-2 text-xs text-neutral-700">
          Quem salvou o evento será avisado e isso não pode ser desfeito.
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            ref={keepEventButtonRef}
            type="button"
            onClick={closeCancelDialog}
            className="cursor-pointer border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase hover:bg-neutral-100"
          >
            Manter evento
          </button>
          <button
            type="button"
            onClick={confirmCancel}
            className="cursor-pointer border-2 border-black bg-red-700 px-3 py-1.5 text-[11px] font-black uppercase text-white hover:bg-red-800"
          >
            Sim, cancelar evento
          </button>
        </div>
      </dialog>

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) {
    return items.join("");
  }
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default OrganizerPage;
