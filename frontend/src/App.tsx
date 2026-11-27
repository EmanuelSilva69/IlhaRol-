import { useEffect, useState } from "react";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { INITIAL_EVENTS, INITIAL_NOTIFICATIONS } from "./data/mockEvents";
import {
  INITIAL_USER_PROFILE,
  INITIAL_USER_REPORTS,
} from "./data/mockUser";
import {
  addReview as apiAddReview,
  cancelEvent as apiCancelEvent,
  changePassword as apiChangePassword,
  createEvent as apiCreateEvent,
  createReport as apiCreateReport,
  favoriteEvent as apiFavoriteEvent,
  getProfile as apiGetProfile,
  isApiError,
  listEvents as apiListEvents,
  listNotifications as apiListNotifications,
  listReports as apiListReports,
  markNotificationsRead as apiMarkNotificationsRead,
  unfavoriteEvent as apiUnfavoriteEvent,
  updatePreferences as apiUpdatePreferences,
  updateProfile as apiUpdateProfile,
  type AuthResult,
} from "./lib/api";
import AgendaPage from "./pages/AgendaPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import FeedPage from "./pages/FeedPage";
import LoginPage from "./pages/LoginPage";
import OrganizerPage, { type EventsStatus } from "./pages/OrganizerPage";
import ProfilePage from "./pages/ProfilePage";
import type {
  CulturalEvent,
  EventReview,
  NewEventInput,
  UserNotification,
  UserProfile,
  UserReport,
} from "./types/event";

const FALLBACK_HASH = "#/feed";
const PROFILE_STORAGE_KEY = "ilharole:profile";
const AUTH_STORAGE_KEY = "ilharole:token";

function loadProfile(): UserProfile {
  if (typeof window === "undefined") {
    return INITIAL_USER_PROFILE;
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return INITIAL_USER_PROFILE;
    }

    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      ...INITIAL_USER_PROFILE,
      ...parsed,
      notificationPreferences: {
        ...INITIAL_USER_PROFILE.notificationPreferences,
        ...(parsed.notificationPreferences ?? {}),
      },
    };
  } catch {
    return INITIAL_USER_PROFILE;
  }
}

function useHashRoute(): string {
  const [hash, setHash] = useState(() =>
    typeof window === "undefined"
      ? FALLBACK_HASH
      : window.location.hash || FALLBACK_HASH,
  );

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || FALLBACK_HASH);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return hash;
}

function App() {
  const [apiToken, setApiToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  });
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [events, setEvents] = useState<CulturalEvent[]>(() =>
    INITIAL_EVENTS.map((event) =>
      event.organizerId === profile.organizerId
        ? { ...event, organizer: profile.name }
        : event,
    ),
  );
  const [eventsStatus, setEventsStatus] = useState<EventsStatus>("loading");
  const [notifications, setNotifications] = useState<UserNotification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [reports, setReports] = useState<UserReport[]>(INITIAL_USER_REPORTS);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(apiToken));

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // localStorage pode estar indisponível em modo privado; o perfil segue em memória.
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function loadFromApi() {
      try {
        if (apiToken) {
          const [apiProfile, apiEvents, apiNotifications, apiReports] =
            await Promise.all([
              apiGetProfile(apiToken),
              apiListEvents({ token: apiToken }),
              apiListNotifications(apiToken),
              apiListReports(apiToken),
            ]);

          if (cancelled) {
            return;
          }

          setProfile(apiProfile);
          setEvents(apiEvents);
          setNotifications(apiNotifications);
          setReports(apiReports);
          setIsAuthenticated(true);
          setEventsStatus("ready");
          return;
        }

        const publicEvents = await apiListEvents();
        if (!cancelled) {
          setEvents(publicEvents);
          setEventsStatus("ready");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (apiToken && isApiError(error) && error.status === 401) {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          setApiToken(null);
          setIsAuthenticated(false);
          return;
        }

        // API indisponível: mantém o estado mockado para não quebrar o protótipo.
        setEventsStatus("error");
      }
    }

    void loadFromApi();
    return () => {
      cancelled = true;
    };
  }, [apiToken]);

  const hash = useHashRoute();
  const cleanHash = hash.replace(/^#/, "");
  const segments = cleanHash.split("/").filter(Boolean);
  const route = segments[0] ?? "feed";
  const eventId = segments[1];

  const favoritesCount = events.filter((event) => event.isFavorite).length;
  const unreadAlertsCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const handleToggleFavorite = (targetEventId: string) => {
    const target = events.find((event) => event.id === targetEventId);
    const nextFavorite = !target?.isFavorite;

    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, isFavorite: nextFavorite }
          : event,
      ),
    );

    if (apiToken) {
      const action = nextFavorite ? apiFavoriteEvent : apiUnfavoriteEvent;
      void action(apiToken, targetEventId).catch(() => {
        // Mantém o estado otimista local se a API falhar.
      });
    }
  };

  const appendReview = (targetEventId: string, review: EventReview) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, reviews: [review, ...event.reviews] }
          : event,
      ),
    );
  };

  const handleAddReview = (
    targetEventId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment: string,
  ) => {
    const localReview: EventReview = {
      id: `rev-${Date.now()}`,
      author: `${profile.name} (Você)`,
      authorId: profile.id,
      rating,
      comment,
      createdAt: new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
    };

    if (apiToken) {
      void apiAddReview(apiToken, targetEventId, rating, comment)
        .then((review) => appendReview(targetEventId, review))
        .catch(() => appendReview(targetEventId, localReview));
      return;
    }

    appendReview(targetEventId, localReview);
  };

  const handleCancelEvent = (targetEventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, status: "CANCELADO" }
          : event,
      ),
    );

    if (apiToken) {
      void apiCancelEvent(apiToken, targetEventId).catch(() => {
        // Mantém o estado local; a área do organizador continua funcional.
      });
    }
  };

  const addLocalEvent = (input: NewEventInput) => {
    const newEvent: CulturalEvent = {
      id: `evento-${Date.now()}`,
      title: input.title,
      description: input.description,
      category: input.category,
      date: input.date,
      time: input.time,
      location: input.location,
      neighborhood: input.neighborhood,
      latitude: -2.5297,
      longitude: -44.3028,
      bannerUrl: input.bannerUrl,
      organizer: profile.name,
      organizerId: profile.organizerId,
      status: "ATIVO",
      isFavorite: false,
      reviews: [],
    };

    setEvents((prev) => [newEvent, ...prev]);
  };

  const reloadEvents = async () => {
    setEventsStatus("loading");
    try {
      setEvents(await apiListEvents({ token: apiToken }));
      setEventsStatus("ready");
    } catch {
      setEventsStatus("error");
    }
  };

  // Com token, só resolve depois que a API confirma; a falha chega à tela.
  const handlePublishEvent = async (input: NewEventInput) => {
    if (apiToken) {
      const event = await apiCreateEvent(apiToken, input);
      setEvents((prev) => [event, ...prev]);
      return;
    }

    addLocalEvent(input);
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));

    if (updates.name?.trim()) {
      const nextName = updates.name.trim();
      setEvents((prev) =>
        prev.map((event) =>
          event.organizerId === profile.organizerId
            ? { ...event, organizer: nextName }
            : event,
        ),
      );
    }

    if (!apiToken) {
      return;
    }

    if (updates.notificationPreferences) {
      void apiUpdatePreferences(apiToken, updates.notificationPreferences).catch(
        () => {
          // Preferência permanece aplicada localmente.
        },
      );
    }

    const profilePayload: {
      name?: string;
      neighborhood?: string;
      bio?: string;
      interests?: string[];
    } = {};
    if (updates.name !== undefined) profilePayload.name = updates.name;
    if (updates.neighborhood !== undefined) {
      profilePayload.neighborhood = updates.neighborhood;
    }
    if (updates.bio !== undefined) profilePayload.bio = updates.bio;
    if (updates.interests !== undefined) {
      profilePayload.interests = updates.interests;
    }

    if (Object.keys(profilePayload).length > 0) {
      void apiUpdateProfile(apiToken, profilePayload)
        .then((apiProfile) => setProfile(apiProfile))
        .catch(() => {
          // Mantém a edição local se a API falhar.
        });
    }
  };

  const handleAddReport = (
    input: Omit<UserReport, "id" | "createdAt" | "status">,
  ) => {
    const localReport: UserReport = {
      ...input,
      id: `report-${Date.now()}`,
      createdAt: new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
      status: "EM_ANALISE",
    };

    if (apiToken) {
      void apiCreateReport(apiToken, {
        eventId: input.eventId,
        eventTitle: input.eventTitle,
        targetType: input.targetType,
        reviewId: input.reviewId,
        reason: input.reason,
        description: input.description,
      })
        .then((report) => setReports((prev) => [report, ...prev]))
        .catch(() => setReports((prev) => [localReport, ...prev]));
      return;
    }

    setReports((prev) => [localReport, ...prev]);
  };

  const handleLogin = (result: AuthResult) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, result.token);
    setApiToken(result.token);
    setProfile(result.profile);
    setIsAuthenticated(true);
    window.location.hash = "#/feed";
  };

  const handleToggleAuth = () => {
    if (isAuthenticated) {
      handleLogout();
      return;
    }
    window.location.hash = "#/login";
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setApiToken(null);
    setIsAuthenticated(false);
    setProfile(INITIAL_USER_PROFILE);
    setEvents(INITIAL_EVENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setReports(INITIAL_USER_REPORTS);
    window.location.hash = "#/login";
  };

  const handleMarkAllAlertsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );

    if (apiToken) {
      void apiMarkNotificationsRead(apiToken).catch(() => {
        // Mantém o estado local.
      });
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!apiToken) {
      throw new Error("Entre na conta para alterar a senha.");
    }

    await apiChangePassword(apiToken, currentPassword, newPassword);
  };

  let page;

  switch (route) {
    case "evento":
      page = (
        <EventDetailsPage
          event={events.find((event) => event.id === eventId)}
          allEvents={events}
          onToggleFavorite={handleToggleFavorite}
          onAddReview={handleAddReview}
          onReport={handleAddReport}
        />
      );
      break;
    case "login":
      page = <LoginPage onLogin={handleLogin} />;
      break;
    case "minha-agenda":
      page = (
        <AgendaPage
          events={events}
          notifications={notifications}
          onToggleFavorite={handleToggleFavorite}
        />
      );
      break;
    case "organizador":
      page = (
        <OrganizerPage
          events={events}
          eventsStatus={eventsStatus}
          onRetryEvents={() => void reloadEvents()}
          organizerId={profile.organizerId}
          organizerName={profile.name}
          onCancelEvent={handleCancelEvent}
          onPublishEvent={handlePublishEvent}
        />
      );
      break;
    case "perfil":
      page = (
        <ProfilePage
          profile={profile}
          events={events}
          notifications={notifications}
          reports={reports}
          onUpdateProfile={handleUpdateProfile}
          onMarkAllAlertsRead={handleMarkAllAlertsRead}
          onToggleFavorite={handleToggleFavorite}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />
      );
      break;
    case "feed":
    default:
      page = (
        <FeedPage events={events} onToggleFavorite={handleToggleFavorite} />
      );
      break;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Navbar
        currentHash={hash}
        favoritesCount={favoritesCount}
        unreadAlertsCount={unreadAlertsCount}
        isAuthenticated={isAuthenticated}
        userName={profile.name}
        onToggleAuth={handleToggleAuth}
      />

      <div
        key={`${route}-${eventId ?? "raiz"}`}
        className="page-enter mx-auto max-w-6xl px-4 py-8"
      >
        {page}
      </div>

      <Footer />
    </main>
  );
}

export default App;
