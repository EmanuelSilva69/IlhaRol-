import { useEffect, useState } from "react";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { INITIAL_EVENTS, INITIAL_NOTIFICATIONS } from "./data/mockEvents";
import AgendaPage from "./pages/AgendaPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import FeedPage from "./pages/FeedPage";
import LoginPage from "./pages/LoginPage";
import OrganizerPage from "./pages/OrganizerPage";
import ProfilePage from "./pages/ProfilePage";
import type {
  CulturalEvent,
  EventReview,
  NewEventInput,
  UserNotification,
} from "./types/event";

const FALLBACK_HASH = "#/feed";

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
  const [events, setEvents] = useState<CulturalEvent[]>(INITIAL_EVENTS);
  const [notifications, setNotifications] = useState<UserNotification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userName, setUserName] = useState("Emanuel Lopes");

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
    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, isFavorite: !event.isFavorite }
          : event,
      ),
    );
  };

  const handleAddReview = (
    targetEventId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment: string,
  ) => {
    const review: EventReview = {
      id: `rev-${Date.now()}`,
      author: `${userName} (Você)`,
      rating,
      comment,
      createdAt: new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
    };

    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, reviews: [review, ...event.reviews] }
          : event,
      ),
    );
  };

  const handleCancelEvent = (targetEventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === targetEventId
          ? { ...event, status: "CANCELADO" }
          : event,
      ),
    );
  };

  const handlePublishEvent = (input: NewEventInput) => {
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
      organizer: userName,
      organizerId: "org-carlos",
      status: "ATIVO",
      isFavorite: false,
      reviews: [],
    };

    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleLogin = (name: string) => {
    setUserName(name);
    setIsAuthenticated(true);
  };

  const handleToggleAuth = () => {
    setIsAuthenticated((prev) => !prev);
  };

  const handleMarkAllAlertsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
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
          onCancelEvent={handleCancelEvent}
          onPublishEvent={handlePublishEvent}
        />
      );
      break;
    case "perfil":
      page = (
        <ProfilePage
          userName={userName}
          notifications={notifications}
          onMarkAllAlertsRead={handleMarkAllAlertsRead}
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
        userName={userName}
        onToggleAuth={handleToggleAuth}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">{page}</div>

      <Footer />
    </main>
  );
}

export default App;
