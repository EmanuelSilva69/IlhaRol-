import { type FormEvent, useEffect, useState } from "react";
import EventMap from "../components/EventMap";
import RfBadge from "../components/RfBadge";
import { categoryLabel } from "../lib/markers";
import type { CulturalEvent } from "../types/event";

interface EventDetailsPageProps {
  event: CulturalEvent | undefined;
  allEvents: CulturalEvent[];
  onToggleFavorite: (eventId: string) => void;
  onAddReview: (
    eventId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment: string,
  ) => void;
  onReport: (input: {
    eventId: string;
    eventTitle: string;
    targetType: "EVENTO" | "AVALIACAO";
    reviewId?: string;
    reason: string;
    description: string;
  }) => void;
}

export function EventDetailsPage({
  event,
  allEvents,
  onToggleFavorite,
  onAddReview,
  onReport,
}: EventDetailsPageProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("INFORMACAO_FALSA");
  const [reportTarget, setReportTarget] = useState("EVENTO");
  const [reportReviewId, setReportReviewId] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [simulateNotFound, setSimulateNotFound] = useState(false);
  const [ratingFlash, setRatingFlash] = useState(0);

  useEffect(() => {
    if (!ratingFlash) {
      return;
    }

    const timer = window.setTimeout(() => setRatingFlash(0), 1600);
    return () => window.clearTimeout(timer);
  }, [ratingFlash]);

  if (!event || simulateNotFound) {
    return (
      <div className="space-y-6">
        <RfBadge
          screenNumber="Tela 2 (Estado 404)"
          screenTitle="Detalhes do Evento — Erro 404 Recurso Inexistente"
          rfs={["RF04"]}
          rnfs={["RNF04"]}
          userStories={["US03"]}
          description="Demonstra o critério de aceite do RF04 e Fluxo 2 (Caminho Alternativo B): quando o identificador do evento não existe no banco, a interface exibe mensagem amigável de erro 404 sem vazar stack trace."
        />

        <div
          role="alert"
          className="border-2 border-black bg-red-50 p-8 text-center"
        >
          <p className="text-xs font-black uppercase tracking-widest text-red-900">
            HTTP 404 Not Found · Contrato REST Padronizado (RNF04)
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase text-black">
            Ops! Evento não encontrado
          </h2>
          <p className="mt-2 text-xs text-neutral-700">
            O identificador consultado não corresponde a nenhuma publicação ativa,
            realizada ou cancelada no IlhaRolê.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {simulateNotFound && (
              <button
                type="button"
                onClick={() => setSimulateNotFound(false)}
                className="cursor-pointer border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black"
              >
                Voltar para a ficha do evento
              </button>
            )}
            <a
              href="#/feed"
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
            >
              Voltar ao Feed de Eventos
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    const publicCanonicalUrl = `${window.location.origin}${window.location.pathname}#/evento/${event.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(publicCanonicalUrl).catch(() => undefined);
    }
    setShareFeedback(
      `Link público copiado (sem tokens privados — RF13): ${publicCanonicalUrl}`,
    );
  };

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (event.status !== "REALIZADO") {
      return;
    }
    if (!comment.trim()) {
      setReviewFeedback("Informe um comentário textual para registrar sua avaliação.");
      return;
    }
    onAddReview(event.id, rating, comment.trim());
    setComment("");
    setReviewFeedback(
      "Avaliação registrada com sucesso! (RF06 — limite de 1 avaliação por usuário/evento respeitado).",
    );
  };

  const handleReportSubmit = (e: FormEvent) => {
    e.preventDefault();
    onReport({
      eventId: event.id,
      eventTitle: event.title,
      targetType: reportTarget as "EVENTO" | "AVALIACAO",
      reviewId:
        reportTarget === "AVALIACAO"
          ? reportReviewId || event.reviews[0]?.id
          : undefined,
      reason: reportReason,
      description: reportDescription.trim(),
    });
    setReportSubmitted(true);
    setReportDescription("");
    setReportReviewId("");
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 2"
        screenTitle="Ficha de Detalhes do Evento, Geolocalização, Avaliação e Denúncia"
        rfs={["RF04", "RF05", "RF06", "RF13", "RF14"]}
        rnfs={["RNF04", "RNF05", "RNF06"]}
        userStories={["US03", "US04", "US06", "US08"]}
        description="Exibe as informações completas do evento selecionado, alerta visual para eventos CANCELADOS, mapa Leaflet focado na coordenada exata, compartilhamento de link canônico (RF13), módulo de avaliações exclusivo para eventos REALIZADOS (RF06) e modal de denúncia para moderação (RF14)."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black bg-neutral-100 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-black uppercase">
            Alternar evento de demonstração:
          </span>
          {allEvents.map((item) => (
            <a
              key={item.id}
              href={`#/evento/${item.id}`}
              className={`border border-black px-2 py-1 text-[11px] font-bold uppercase ${
                item.id === event.id
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-neutral-200"
              }`}
            >
              {item.title.slice(0, 22)}... ({item.status})
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSimulateNotFound(true)}
          className="cursor-pointer border border-black bg-red-100 px-2.5 py-1 text-[11px] font-black uppercase text-red-950 hover:bg-red-200"
        >
          Simular Erro 404 (RF04)
        </button>
      </div>

      {event.status === "CANCELADO" && (
        <div
          role="alert"
          className="border-2 border-black bg-red-200 p-4 text-red-950"
        >
          <p className="text-sm font-black uppercase">
            ⚠ Publicação com status: EVENTO CANCELADO PELO ORGANIZADOR (RF04 / RF07)
          </p>
          <p className="mt-1 text-xs">
            Este evento foi cancelado, mas sua ficha permanece disponível para
            consulta dos usuários que o haviam salvo na agenda pessoal (RF11).
          </p>
        </div>
      )}

      <article className="border-2 border-black bg-white p-5">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-black bg-neutral-100 px-2.5 py-1 text-xs font-black uppercase">
                {categoryLabel(event.category)}
              </span>
              <span className="border border-black bg-neutral-100 px-2.5 py-1 text-xs font-bold uppercase">
                Bairro: {event.neighborhood}
              </span>
              <span
                className={`border border-black px-2.5 py-1 text-xs font-black uppercase ${
                  event.status === "CANCELADO"
                    ? "bg-red-300 text-black"
                    : event.status === "REALIZADO"
                      ? "bg-neutral-300 text-black"
                      : "bg-emerald-300 text-black"
                }`}
              >
                Situação: {event.status}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-black text-black">
              {event.title}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-neutral-800">
              {event.description}
            </p>

            <dl className="mt-4 grid gap-2 border-t border-b border-black py-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-black uppercase text-neutral-600">
                  Data e Horário
                </dt>
                <dd className="mt-0.5 font-bold text-black">
                  {event.date} · {event.time}
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase text-neutral-600">
                  Organizador Responsável
                </dt>
                <dd className="mt-0.5 font-bold text-black">
                  {event.organizer}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-black uppercase text-neutral-600">
                  Endereço / Localização
                </dt>
                <dd className="mt-0.5 font-bold text-black">
                  {event.location} — {event.neighborhood}, São Luís - MA (Lat:{" "}
                  {event.latitude}, Lng: {event.longitude})
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onToggleFavorite(event.id)}
                aria-pressed={event.isFavorite}
                className={`cursor-pointer border-2 border-black px-4 py-2 text-xs font-black uppercase ${
                  event.isFavorite
                    ? "bg-black text-white"
                    : "bg-amber-200 text-black hover:bg-amber-300"
                }`}
              >
                {event.isFavorite
                  ? "★ Salvo na Minha Agenda (RF05)"
                  : "☆ Tenho Interesse / Salvar (RF05)"}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="cursor-pointer border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black hover:bg-neutral-100"
              >
                Compartilhar Link (RF13)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReportModal((prev) => !prev);
                  setReportSubmitted(false);
                }}
                className="cursor-pointer border-2 border-black bg-red-100 px-4 py-2 text-xs font-black uppercase text-red-950 hover:bg-red-200"
              >
                Denunciar Conteúdo (RF14)
              </button>
            </div>

            {shareFeedback && (
              <p
                role="status"
                className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
              >
                {shareFeedback}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <img
              src={event.bannerUrl}
              alt={`Banner ilustrativo do evento ${event.title}`}
              className="h-44 w-full border-2 border-black object-cover"
            />
            <div>
              <h2 className="mb-1 text-xs font-black uppercase">
                Localização no Mapa Interativo (RF04 · Leaflet)
              </h2>
              <EventMap
                events={[event]}
                center={[event.latitude, event.longitude]}
                zoom={15}
              />
            </div>
          </div>
        </div>
      </article>

      {showReportModal && (
        <section
          aria-label="Formulário de denúncia de conteúdo"
          className="anim-fade-scale border-2 border-black bg-red-50 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase">
              Registrar Denúncia para Moderação (RF14)
            </h2>
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="cursor-pointer border border-black bg-white px-2 py-0.5 text-xs font-bold"
            >
              Fechar
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-700">
            Critério de aceite do RF14: a denúncia é enviada para a moderação sem
            expor publicamente a identidade do denunciante e sem remover o
            conteúdo automaticamente antes da análise.
          </p>

          {reportSubmitted ? (
            <div
              role="status"
              className="mt-3 border border-black bg-white p-3 text-xs font-bold text-emerald-900"
            >
              ✓ Denúncia protocolada com sucesso junto à equipe de moderação! O
              conteúdo segue visível até revisão e sua identidade permanece
              protegida.
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="report-target"
                    className="block text-xs font-bold uppercase"
                  >
                    Alvo da Denúncia (XOR: Evento ou Avaliação)
                  </label>
                  <select
                    id="report-target"
                    value={reportTarget}
                    onChange={(e) => setReportTarget(e.target.value)}
                    className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="EVENTO">Publicação do Evento</option>
                    <option value="AVALIACAO">Comentário / Avaliação</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="report-reason"
                    className="block text-xs font-bold uppercase"
                  >
                    Motivo Principal
                  </label>
                  <select
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="INFORMACAO_FALSA">
                      Informação fraudulenta / Evento falso
                    </option>
                    <option value="DISCURSO_OFENSIVO">
                      Conteúdo ofensivo ou inadequado
                    </option>
                    <option value="SPAM">Spam / Propaganda enganosa</option>
                  </select>
                </div>
              </div>

              {reportTarget === "AVALIACAO" && (
                <div>
                  <label
                    htmlFor="report-review"
                    className="block text-xs font-bold uppercase"
                  >
                    Comentário / Avaliação denunciada
                  </label>
                  {event.reviews.length === 0 ? (
                    <p className="mt-1 border border-black bg-white p-2 text-[11px]">
                      Este evento ainda não possui avaliações. Selecione
                      “Publicação do Evento” ou avalie o evento primeiro.
                    </p>
                  ) : (
                    <select
                      id="report-review"
                      value={reportReviewId || event.reviews[0]?.id}
                      onChange={(e) => setReportReviewId(e.target.value)}
                      className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                    >
                      {event.reviews.map((review) => (
                        <option key={review.id} value={review.id}>
                          {review.author} · {review.rating}/5 ·{" "}
                          {review.comment.slice(0, 60)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="report-description"
                  className="block text-xs font-bold uppercase"
                >
                  Descrição Adicional (Opcional)
                </label>
                <textarea
                  id="report-description"
                  rows={2}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Descreva detalhes para auxiliar a moderação..."
                  className="mt-1 w-full border-2 border-black bg-white p-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
              >
                Enviar Denúncia
              </button>
            </form>
          )}
        </section>
      )}

      <section
        aria-label="Avaliações e comentários do evento"
        className="border-2 border-black bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-3">
          <div>
            <h2 className="text-sm font-black uppercase">
              Avaliações e Comentários Pós-Evento (RF06 · US06)
            </h2>
            <p className="text-xs text-neutral-600">
              Regra de negócio: avaliações (nota inteira de 1 a 5) são permitidas
              exclusivamente para eventos já ocorridos (`REALIZADO`).
            </p>
          </div>
          {event.status !== "REALIZADO" && (
            <a
              href="#/evento/gastronomia-2"
              className="border border-black bg-amber-200 px-3 py-1 text-xs font-black uppercase text-black hover:bg-amber-300"
            >
              Testar em Evento Já Realizado →
            </a>
          )}
        </div>

        {event.status !== "REALIZADO" ? (
          <div
            role="note"
            className="mt-4 border-2 border-dashed border-black bg-neutral-100 p-4 text-xs"
          >
            <strong>Formulário de avaliação bloqueado (Critério de Aceite RF06):</strong>{" "}
            Este evento está com situação <strong>{event.status}</strong>. O
            sistema bloqueia notas e comentários em eventos com data futura ou
            cancelados. Acesse o evento{" "}
            <a
              href="#/evento/gastronomia-2"
              className="font-black underline"
            >
              Feirinha São Luís (REALIZADO)
            </a>{" "}
            para testar o envio de avaliação.
          </div>
        ) : (
          <form
            onSubmit={handleReviewSubmit}
            className="mt-4 space-y-3 border-2 border-black bg-neutral-50 p-4"
          >
            <h3 className="text-xs font-black uppercase">
              Deixe sua avaliação sobre este evento realizado
            </h3>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <label
                  htmlFor="review-rating"
                  className="block text-xs font-bold uppercase"
                >
                  Nota (1 a 5 estrelas)
                </label>
                <select
                  id="review-rating"
                  value={rating}
                  onChange={(e) => {
                    setRating(Number(e.target.value) as 1 | 2 | 3 | 4 | 5);
                    setRatingFlash((current) => current + 1);
                  }}
                  className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-bold"
                >
                  <option value={5}>5 ★ — Excelente</option>
                  <option value={4}>4 ★ — Muito bom</option>
                  <option value={3}>3 ★ — Regular</option>
                  <option value={2}>2 ★ — Fraco</option>
                  <option value={1}>1 ★ — Ruim</option>
                </select>
                {ratingFlash > 0 && (
                  <div
                    aria-hidden="true"
                    className="mt-1 flex gap-0.5 text-base leading-none"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <span
                        key={`${ratingFlash}-${value}`}
                        className={`anim-star ${
                          value <= rating ? "text-amber-500" : "text-neutral-300"
                        }`}
                        style={{ animationDelay: `${(value - 1) * 60}ms` }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-xs font-bold uppercase"
                >
                  Comentário sobre a experiência
                </label>
                <input
                  id="review-comment"
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte como foi a estrutura, horário e atrações..."
                  className="mt-1 w-full border-2 border-black bg-white px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
            >
              Publicar Avaliação (RF06)
            </button>

            {reviewFeedback && (
              <p
                role="status"
                className="anim-rise border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
              >
                {reviewFeedback}
              </p>
            )}
          </form>
        )}

        <div className="mt-4 space-y-3">
          {event.reviews.length === 0 ? (
            <p className="text-xs text-neutral-600">
              Nenhuma avaliação registrada até o momento para este evento.
            </p>
          ) : (
            event.reviews.map((rev) => (
              <div
                key={rev.id}
                className="border border-black bg-neutral-50 p-3 text-xs"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{rev.author}</span>
                  <span className="bg-black px-2 py-0.5 text-white">
                    Nota: {rev.rating}/5 ★
                  </span>
                </div>
                <p className="mt-1.5 text-neutral-800">{rev.comment}</p>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Registrado em {rev.createdAt}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default EventDetailsPage;