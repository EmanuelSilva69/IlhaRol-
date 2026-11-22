import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import RfBadge from "../components/RfBadge";
import Toast from "../components/Toast";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import { categoryLabel } from "../lib/markers";
import type {
  CulturalEvent,
  NotificationPreferences,
  UserNotification,
  UserProfile,
  UserReport,
  UserRole,
} from "../types/event";

interface ProfilePageProps {
  profile: UserProfile;
  events: CulturalEvent[];
  notifications: UserNotification[];
  reports: UserReport[];
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onMarkAllAlertsRead: () => void;
  onToggleFavorite: (eventId: string) => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onLogout: () => void;
}

type ProfileTab =
  | "dados"
  | "agenda"
  | "avaliacoes"
  | "eventos"
  | "notificacoes"
  | "denuncias"
  | "seguranca";

const INTERESTS = [
  "Bumba Meu Boi",
  "Música e reggae",
  "Teatro",
  "Gastronomia",
  "Museus",
  "Tambor de Crioula",
  "Samba e pagode",
  "Orla e praia",
  "Feirinhas",
  "Cinema",
];

const ROLE_LABELS: Record<UserRole, string> = {
  visitor: "Espectador",
  producer: "Produtor cultural",
  admin: "Administrador",
};

const REPORT_REASON_LABELS: Record<string, string> = {
  INFORMACAO_FALSA: "Informação falsa / evento fraudulento",
  DISCURSO_OFENSIVO: "Conteúdo ofensivo ou inadequado",
  SPAM: "Spam / propaganda enganosa",
};

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "IR"
  );
}

function starsFor(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function ProfilePage({
  profile,
  events,
  notifications,
  reports,
  onUpdateProfile,
  onMarkAllAlertsRead,
  onToggleFavorite,
  onChangePassword,
  onLogout,
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("dados");
  const [form, setForm] = useState({
    name: profile.name,
    neighborhood: profile.neighborhood,
    bio: profile.bio,
    interests: profile.interests,
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setForm({
      name: profile.name,
      neighborhood: profile.neighborhood,
      bio: profile.bio,
      interests: profile.interests,
    });
  }, [profile.name, profile.neighborhood, profile.bio, profile.interests]);

  const favoriteEvents = events
    .filter((event) => event.isFavorite)
    .sort((a, b) => a.date.localeCompare(b.date));

  const myReviews = events.flatMap((event) =>
    event.reviews
      .filter((review) => review.authorId === profile.id)
      .map((review) => ({ event, review })),
  );

  const myEvents = events.filter(
    (event) => event.organizerId === profile.organizerId,
  );

  const unreadAlerts = notifications.filter(
    (notification) => !notification.read,
  );

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: "dados", label: "Meus dados" },
    { id: "agenda", label: "Minha agenda", count: favoriteEvents.length },
    { id: "avaliacoes", label: "Avaliações", count: myReviews.length },
    { id: "eventos", label: "Meus eventos", count: myEvents.length },
    {
      id: "notificacoes",
      label: "Notificações & alertas",
      count: unreadAlerts.length,
    },
    { id: "denuncias", label: "Denúncias", count: reports.length },
    { id: "seguranca", label: "Segurança" },
  ];

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      setToast("Informe um nome com pelo menos 2 caracteres.");
      return;
    }

    onUpdateProfile({
      name: form.name.trim(),
      neighborhood: form.neighborhood,
      bio: form.bio.trim(),
      interests: form.interests,
    });
    setToast("Perfil atualizado com sucesso (RF01b).");
  };

  const handlePreferenceToggle = (
    key: keyof NotificationPreferences,
  ) => {
    onUpdateProfile({
      notificationPreferences: {
        ...profile.notificationPreferences,
        [key]: !profile.notificationPreferences[key],
      },
    });
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (
      !passwordForm.current ||
      !passwordForm.next ||
      !passwordForm.confirm
    ) {
      setPasswordFeedback("Preencha a senha atual e a nova senha.");
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordFeedback("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordFeedback("A confirmação não confere com a nova senha.");
      return;
    }

    try {
      await onChangePassword(passwordForm.current, passwordForm.next);
      setPasswordFeedback(
        "Senha alterada com sucesso. Em produção, a API invalidaria os tokens JWT antigos (RNF03).",
      );
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPasswordFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a senha.",
      );
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];

    setActiveTab(nextTab.id);
    document.getElementById(`profile-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 6"
        screenTitle="Perfil, Preferências Culturais e Central do Usuário"
        rfs={["RF01b", "RF05", "RF06", "RF08", "RF10", "RF12", "RF14"]}
        rnfs={["RNF05", "RNF06"]}
        userStories={["US01", "US04", "US06", "US09"]}
        description="Centraliza os dados do usuário, preferências culturais, alertas, agenda pessoal, avaliações, eventos publicados, denúncias e segurança. As alterações de perfil alimentam os alertas e são persistidas no navegador neste protótipo."
      />

      <section
        aria-label="Resumo do perfil"
        className="border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-black bg-amber-200 text-xl font-black uppercase"
            >
              {initialsFor(profile.name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black uppercase leading-tight">
                  {profile.name}
                </h1>
                <span className="border border-black bg-emerald-200 px-2 py-0.5 text-[10px] font-black uppercase">
                  {ROLE_LABELS[profile.role]}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-700">{profile.email}</p>
              <p className="mt-1 text-xs font-bold">
                {profile.neighborhood} · Desde {formatDate(profile.memberSince)}
              </p>
              {profile.bio && (
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-neutral-700">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("dados")}
              className="cursor-pointer border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white hover:bg-neutral-800"
            >
              Editar perfil
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="cursor-pointer border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase hover:bg-neutral-100"
            >
              Sair da conta
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Salvos na agenda", value: favoriteEvents.length },
            { label: "Avaliações feitas", value: myReviews.length },
            { label: "Eventos publicados", value: myEvents.length },
            { label: "Denúncias", value: reports.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-black bg-neutral-50 p-3 text-center"
            >
              <span className="block text-2xl font-black">{stat.value}</span>
              <span className="mt-0.5 block text-[10px] font-black uppercase text-neutral-600">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav
          aria-label="Seções do perfil"
          role="tablist"
          className="self-start border-2 border-black bg-white"
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`profile-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={
                  isActive ? `profile-panel-${tab.id}` : undefined
                }
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 border-b border-black px-3 py-2.5 text-left text-[11px] font-black uppercase last:border-b-0 focus:outline-2 focus:outline-offset-[-4px] focus:outline-black ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={`border px-1.5 py-0.5 text-[10px] ${
                      isActive
                        ? "border-white text-white"
                        : "border-black bg-neutral-100 text-black"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <section
          id={`profile-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          className="min-h-[360px] border-2 border-black bg-white p-5"
        >
          {activeTab === "dados" && (
            <div>
              <SectionHeader
                title="Dados do perfil (RF01b)"
                description="O usuário só edita o próprio perfil. Nome, bairro e interesses alimentam a seleção de eventos e alertas."
              />

              <form onSubmit={handleSaveProfile} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-name"
                      className="block text-xs font-bold uppercase"
                    >
                      Nome completo
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      autoComplete="name"
                      className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-bold uppercase"
                    >
                      E-mail (somente leitura)
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      readOnly
                      className="mt-1 w-full border-2 border-black bg-neutral-100 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-neighborhood"
                      className="block text-xs font-bold uppercase"
                    >
                      Bairro de interesse
                    </label>
                    <select
                      id="profile-neighborhood"
                      value={form.neighborhood}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          neighborhood: event.target.value,
                        }))
                      }
                      className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
                    >
                      {SAO_LUIS_NEIGHBORHOODS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-role"
                      className="block text-xs font-bold uppercase"
                    >
                      Tipo de conta
                    </label>
                    <input
                      id="profile-role"
                      type="text"
                      value={ROLE_LABELS[profile.role]}
                      readOnly
                      className="mt-1 w-full border-2 border-black bg-neutral-100 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-bold uppercase"
                  >
                    Bio curta
                  </label>
                  <textarea
                    id="profile-bio"
                    rows={3}
                    value={form.bio}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
                    placeholder="Conte um pouco sobre você e sua relação com a cultura local."
                    className="mt-1 w-full border-2 border-black p-2 text-xs"
                  />
                </div>

                <fieldset>
                  <legend className="text-xs font-bold uppercase">
                    Preferências culturais
                  </legend>
                  <div className="mt-1 grid grid-cols-1 gap-1 text-[11px] sm:grid-cols-2">
                    {INTERESTS.map((interest) => (
                      <label
                        key={interest}
                        className="flex cursor-pointer items-center gap-1.5 border border-neutral-300 px-1.5 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={form.interests.includes(interest)}
                          onChange={() => toggleInterest(interest)}
                          className="accent-black"
                        />
                        {interest}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
                  >
                    Salvar alterações (RF01b)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        name: profile.name,
                        neighborhood: profile.neighborhood,
                        bio: profile.bio,
                        interests: profile.interests,
                      })
                    }
                    className="cursor-pointer border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase hover:bg-neutral-100"
                  >
                    Descartar mudanças
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "agenda" && (
            <div>
              <SectionHeader
                title={`Minha agenda (${favoriteEvents.length})`}
                description="Eventos marcados com “Tenho interesse”, em ordem cronológica (RF05 / RF10)."
              />

              {favoriteEvents.length === 0 ? (
                <EmptyState
                  title="Nenhum evento salvo"
                  description="Use o botão “Tenho interesse” no feed ou na ficha de um evento para montar sua agenda."
                  actionHref="#/feed"
                  actionLabel="Explorar eventos"
                />
              ) : (
                <ol className="mt-4 space-y-3">
                  {favoriteEvents.map((event) => (
                    <li
                      key={event.id}
                      className="border-2 border-black bg-neutral-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="border border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase">
                          {formatDate(event.date)} · {event.time}
                        </span>
                        <StatusBadge status={event.status} />
                      </div>
                      <h3 className="mt-2 text-sm font-black leading-snug">
                        <a
                          href={`#/evento/${event.id}`}
                          className="hover:underline"
                        >
                          {event.title}
                        </a>
                      </h3>
                      <p className="mt-1 text-[11px] text-neutral-700">
                        {categoryLabel(event.category)} · {event.location} ·{" "}
                        {event.neighborhood}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={`#/evento/${event.id}`}
                          className="border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                        >
                          Ver detalhes
                        </a>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(event.id)}
                          className="cursor-pointer border border-black bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase text-red-950 hover:bg-red-200"
                        >
                          Remover da agenda
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {activeTab === "avaliacoes" && (
            <div>
              <SectionHeader
                title={`Minhas avaliações (${myReviews.length})`}
                description="Notas e comentários que você registrou em eventos já realizados (RF06)."
              />

              {myReviews.length === 0 ? (
                <EmptyState
                  title="Nenhuma avaliação registrada"
                  description="A avaliação fica disponível apenas em eventos com situação REALIZADO."
                  actionHref="#/evento/gastronomia-2"
                  actionLabel="Ver evento realizado"
                />
              ) : (
                <div className="mt-4 space-y-3">
                  {myReviews.map(({ event, review }) => (
                    <article
                      key={review.id}
                      className="border-2 border-black bg-neutral-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a
                          href={`#/evento/${event.id}`}
                          className="text-sm font-black underline"
                        >
                          {event.title}
                        </a>
                        <span className="border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                          {review.rating}/5 · {starsFor(review.rating)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-800">
                        {review.comment}
                      </p>
                      <p className="mt-1 text-[10px] text-neutral-500">
                        Registrada em {review.createdAt}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "eventos" && (
            <div>
              <SectionHeader
                title={`Meus eventos (${myEvents.length})`}
                description="Publicações vinculadas ao seu perfil de produtor. A edição e o cancelamento ficam na área do organizador (RF02 / RF07)."
              />

              {myEvents.length === 0 ? (
                <EmptyState
                  title="Nenhum evento publicado"
                  description="Publique sua primeira atração cultural e acompanhe o status na área do organizador."
                  actionHref="#/organizador"
                  actionLabel="Publicar evento"
                />
              ) : (
                <div className="mt-4 space-y-3">
                  {myEvents.map((event) => (
                    <article
                      key={event.id}
                      className="border-2 border-black bg-neutral-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-neutral-600">
                          {formatDate(event.date)} · {event.time}
                        </span>
                        <StatusBadge status={event.status} />
                      </div>
                      <h3 className="mt-1 text-sm font-black leading-snug">
                        <a
                          href={`#/evento/${event.id}`}
                          className="hover:underline"
                        >
                          {event.title}
                        </a>
                      </h3>
                      <p className="mt-1 text-[11px] text-neutral-700">
                        {categoryLabel(event.category)} · {event.neighborhood} ·{" "}
                        {event.location}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={`#/evento/${event.id}`}
                          className="border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
                        >
                          Ver ficha
                        </a>
                        <a
                          href="#/organizador"
                          className="border border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-neutral-800"
                        >
                          Gerenciar
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notificacoes" && (
            <div>
              <SectionHeader
                title={`Notificações & alertas (${unreadAlerts.length} não lidas)`}
                description="Ative ou desative separadamente cada tipo de aviso. As preferências são consultadas antes de qualquer disparo (RF08 / RF11 / RF12)."
              />

              <div className="mt-4 space-y-2">
                <PreferenceToggle
                  id="pref-new-events"
                  checked={profile.notificationPreferences.newEvents}
                  onChange={() => handlePreferenceToggle("newEvents")}
                  title="Novos eventos compatíveis (RF08)"
                  description="Avisos de eventos no seu bairro ou nas categorias de interesse."
                />
                <PreferenceToggle
                  id="pref-event-changes"
                  checked={profile.notificationPreferences.eventChanges}
                  onChange={() => handlePreferenceToggle("eventChanges")}
                  title="Alterações e cancelamentos (RF11)"
                  description="Avisos sobre eventos que você salvou na agenda."
                />
                <PreferenceToggle
                  id="pref-weekly-summary"
                  checked={profile.notificationPreferences.weeklySummary}
                  onChange={() => handlePreferenceToggle("weeklySummary")}
                  title="Resumo semanal (opcional)"
                  description="Um e-mail semanal com os destaques culturais do seu bairro."
                />
              </div>

              <div className="mt-5 border-t border-black pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase">
                    Histórico de notificações
                  </h3>
                  <button
                    type="button"
                    onClick={onMarkAllAlertsRead}
                    disabled={unreadAlerts.length === 0}
                    className="cursor-pointer border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Marcar todas como lidas
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <p className="mt-3 text-xs text-neutral-600">
                    Nenhuma notificação recebida até o momento.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {notifications.map((notification) => (
                      <article
                        key={notification.id}
                        className={`border border-black p-2.5 text-xs ${
                          notification.read ? "bg-white" : "bg-amber-100"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[10px] font-black uppercase">
                            {notification.type === "CANCELAMENTO_EVENTO"
                              ? "Cancelamento"
                              : notification.type === "ALTERACAO_EVENTO"
                                ? "Alteração"
                                : "Novo evento compatível"}
                          </span>
                          <span className="text-[10px] text-neutral-600">
                            {notification.createdAt}
                          </span>
                        </div>
                        <p className="mt-0.5 font-bold">
                          {notification.eventTitle}
                        </p>
                        <p className="mt-1 text-neutral-700">
                          {notification.content}
                        </p>
                        <a
                          href={`#/evento/${notification.eventId}`}
                          className="mt-1.5 inline-block text-[11px] font-black underline"
                        >
                          Abrir detalhes (RF08 / RF11)
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "denuncias" && (
            <div>
              <SectionHeader
                title={`Minhas denúncias (${reports.length})`}
                description="Registros enviados para moderação. Sua identidade não é exibida publicamente e o conteúdo permanece visível até a análise (RF14)."
              />

              {reports.length === 0 ? (
                <EmptyState
                  title="Nenhuma denúncia registrada"
                  description="Você pode denunciar um evento ou comentário diretamente na ficha do evento."
                  actionHref="#/feed"
                  actionLabel="Explorar eventos"
                />
              ) : (
                <div className="mt-4 space-y-3">
                  {reports.map((report) => (
                    <article
                      key={report.id}
                      className="border-2 border-black bg-red-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase text-neutral-700">
                          {report.targetType === "EVENTO"
                            ? "Evento denunciado"
                            : "Avaliação denunciada"}
                        </span>
                        <span className="border border-black bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                          {report.status === "EM_ANALISE"
                            ? "Em análise"
                            : report.status}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-black">
                        <a
                          href={`#/evento/${report.eventId}`}
                          className="underline"
                        >
                          {report.eventTitle}
                        </a>
                      </h3>
                      <p className="mt-1 text-[11px] font-bold">
                        Motivo:{" "}
                        {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                      </p>
                      {report.description && (
                        <p className="mt-1 text-xs text-neutral-700">
                          {report.description}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-neutral-500">
                        Registrada em {report.createdAt}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "seguranca" && (
            <div>
              <SectionHeader
                title="Segurança e privacidade"
                description="Sessão simulada com JWT, alteração de senha e resumo dos dados pessoais armazenados neste protótipo."
              />

              <section className="mt-4 border-2 border-black bg-neutral-50 p-4">
                <h3 className="text-xs font-black uppercase">Sessão atual</h3>
                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">
                      Conta
                    </dt>
                    <dd>{profile.email}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">
                      Perfil
                    </dt>
                    <dd>{ROLE_LABELS[profile.role]}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">
                      Autenticação
                    </dt>
                    <dd>JWT simulado · expiração validada pela API</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase text-neutral-600">
                      Membro desde
                    </dt>
                    <dd>{formatDate(profile.memberSince)}</dd>
                  </div>
                </dl>
              </section>

              <form
                onSubmit={handlePasswordSubmit}
                className="mt-4 border-2 border-black p-4"
              >
                <h3 className="text-xs font-black uppercase">
                  Alterar senha (RNF03)
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="password-current"
                      className="block text-xs font-bold uppercase"
                    >
                      Senha atual
                    </label>
                    <input
                      id="password-current"
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          current: event.target.value,
                        }))
                      }
                      className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password-next"
                      className="block text-xs font-bold uppercase"
                    >
                      Nova senha
                    </label>
                    <input
                      id="password-next"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.next}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          next: event.target.value,
                        }))
                      }
                      className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password-confirm"
                      className="block text-xs font-bold uppercase"
                    >
                      Confirmar nova senha
                    </label>
                    <input
                      id="password-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirm: event.target.value,
                        }))
                      }
                      className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-3 cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
                >
                  Alterar senha
                </button>

                {passwordFeedback && (
                  <p
                    role="status"
                    className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold"
                  >
                    {passwordFeedback}
                  </p>
                )}
              </form>

              <section className="mt-4 border-2 border-dashed border-black p-4 text-xs text-neutral-700">
                <h3 className="text-xs font-black uppercase text-black">
                  Dados guardados e finalidade
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Nome, e-mail e bairro: identificação e personalização.</li>
                  <li>
                    Interesses culturais e preferências: seleção de alertas
                    compatíveis.
                  </li>
                  <li>
                    Favoritos, avaliações e denúncias: funcionamento da agenda,
                    reputação e moderação.
                  </li>
                  <li>
                    Senha: em produção, apenas hash Argon2 com salt individual.
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 cursor-pointer border-2 border-black bg-red-100 px-4 py-2 text-xs font-black uppercase text-red-950 hover:bg-red-200"
                >
                  Encerrar sessão
                </button>
              </section>
            </div>
          )}
        </section>
      </div>

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-black pb-3">
      <h2 className="text-sm font-black uppercase tracking-wide">{title}</h2>
      <p className="mt-1 text-xs text-neutral-600">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CulturalEvent["status"] }) {
  const styles =
    status === "CANCELADO"
      ? "bg-red-200 text-red-950"
      : status === "REALIZADO"
        ? "bg-neutral-200 text-neutral-800"
        : "bg-emerald-200 text-emerald-950";

  return (
    <span
      className={`border border-black px-2 py-0.5 text-[10px] font-black uppercase ${styles}`}
    >
      {status}
    </span>
  );
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div
      role="status"
      className="mt-4 border-2 border-dashed border-black bg-neutral-50 p-6 text-center"
    >
      <p className="text-sm font-black uppercase">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-neutral-700">
        {description}
      </p>
      <a
        href={actionHref}
        className="mt-3 inline-block border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white hover:bg-neutral-800"
      >
        {actionLabel}
      </a>
    </div>
  );
}

function PreferenceToggle({
  id,
  checked,
  onChange,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 border border-black bg-neutral-50 p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 accent-black"
      />
      <span>
        <span className="block text-xs font-black uppercase">{title}</span>
        <span className="mt-0.5 block text-[11px] text-neutral-700">
          {description}
        </span>
      </span>
    </label>
  );
}

export default ProfilePage;
