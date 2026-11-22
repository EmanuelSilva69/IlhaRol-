import { normalizeCategory } from "./map";
import type {
  CulturalEvent,
  EventReview,
  EventStatus,
  NewEventInput,
  NotificationType,
  UserNotification,
  UserProfile,
  UserReport,
  UserRole,
} from "../types/event";

const API_BASE = (
  import.meta.env.VITE_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80";

const CATEGORY_TO_API: Record<string, string> = {
  bumba: "bumba-meu-boi",
  musica: "reggae",
  teatro: "teatro",
  gastronomia: "gastronomia",
  museu: "museus",
  tambor: "tambor-de-crioula",
  samba: "samba-pagode",
  orla: "orla-praia",
  feirinha: "feirinhas-artesanato",
  cinema: "cinema-audiovisual",
};

const API_INTEREST_TO_FRONTEND: Record<string, string> = {
  "Música/Reggae": "Música e reggae",
  "Samba/Pagode": "Samba e pagode",
  "Orla/Praia": "Orla e praia",
  "Feirinhas/Artesanato": "Feirinhas",
  "Cinema/Audiovisual": "Cinema",
};

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  neighborhood: string | null;
  bio: string | null;
  avatar_url: string | null;
  member_since: string;
  interests: string[];
  notification_preferences: {
    new_events: boolean;
    event_changes: boolean;
    weekly_summary: boolean;
  };
}

interface ApiReview {
  id: string;
  author: string;
  author_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface ApiEvent {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  date: string;
  time: string;
  location: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  banner_url: string | null;
  organizer: string | null;
  organizer_id: string | null;
  status: string;
  is_favorite: boolean;
  reviews: ApiReview[];
}

interface ApiNotification {
  id: string;
  event_id: string | null;
  event_title: string | null;
  type: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface ApiReport {
  id: string;
  target_type: "EVENTO" | "AVALIACAO";
  event_id: string | null;
  event_title: string | null;
  review_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface ApiTokenResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface AuthResult {
  token: string;
  profile: UserProfile;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Erro ${response.status} ao chamar a API`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // mantém a mensagem padrão
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function mapProfile(user: ApiUser): UserProfile {
  return {
    id: user.id,
    organizerId: user.id,
    name: user.name,
    email: user.email,
    neighborhood: user.neighborhood ?? "Centro Histórico",
    interests: user.interests.map(
      (interest) => API_INTEREST_TO_FRONTEND[interest] ?? interest,
    ),
    bio: user.bio ?? "",
    role: user.role,
    memberSince: user.member_since,
    notificationPreferences: {
      newEvents: user.notification_preferences.new_events,
      eventChanges: user.notification_preferences.event_changes,
      weeklySummary: user.notification_preferences.weekly_summary,
    },
  };
}

export function mapEvent(event: ApiEvent): CulturalEvent {
  const reviews: EventReview[] = event.reviews.map((review) => ({
    id: review.id,
    author: review.author,
    authorId: review.author_id ?? undefined,
    rating: review.rating as 1 | 2 | 3 | 4 | 5,
    comment: review.comment ?? "",
    createdAt: review.created_at,
  }));

  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    category: normalizeCategory(event.category) ?? event.category ?? "outro",
    date: event.date,
    time: event.time,
    location: event.location ?? "",
    neighborhood: event.neighborhood ?? "",
    latitude: event.latitude ?? -2.5307,
    longitude: event.longitude ?? -44.3068,
    bannerUrl: event.banner_url || DEFAULT_BANNER,
    organizer: event.organizer ?? "Organizador cultural",
    organizerId: event.organizer_id ?? "",
    status: event.status as EventStatus,
    isFavorite: event.is_favorite,
    reviews,
  };
}

export function mapNotification(
  notification: ApiNotification,
): UserNotification {
  return {
    id: notification.id,
    eventId: notification.event_id ?? "",
    eventTitle: notification.event_title ?? "Evento",
    type: notification.type as NotificationType,
    content: notification.content,
    createdAt: notification.created_at,
    read: notification.read,
  };
}

export function mapReport(report: ApiReport): UserReport {
  return {
    id: report.id,
    eventId: report.event_id ?? "",
    eventTitle: report.event_title ?? "Evento",
    targetType: report.target_type,
    reviewId: report.review_id ?? undefined,
    reason: report.reason,
    description: report.description ?? "",
    createdAt: report.created_at,
    status: "EM_ANALISE",
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await request<ApiTokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return {
    token: response.access_token,
    profile: mapProfile(response.user),
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  neighborhood: string;
  interests: string[];
  role?: "visitor" | "producer";
}): Promise<AuthResult> {
  const response = await request<ApiTokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      role: input.role ?? "producer",
    }),
  });

  return {
    token: response.access_token,
    profile: mapProfile(response.user),
  };
}

export async function getProfile(token: string): Promise<UserProfile> {
  const user = await request<ApiUser>("/api/auth/me", {}, token);
  return mapProfile(user);
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string; reset_token?: string | null }> {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function updateProfile(
  token: string,
  payload: Partial<
    Pick<UserProfile, "name" | "neighborhood" | "bio">
  > & { interests?: string[] },
): Promise<UserProfile> {
  const user = await request<ApiUser>("/api/me/perfil", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
  return mapProfile(user);
}

export async function updatePreferences(
  token: string,
  preferences: {
    newEvents?: boolean;
    eventChanges?: boolean;
    weeklySummary?: boolean;
  },
): Promise<void> {
  await request("/api/me/preferencias", {
    method: "PUT",
    body: JSON.stringify({
      new_events: preferences.newEvents,
      event_changes: preferences.eventChanges,
      weekly_summary: preferences.weeklySummary,
    }),
  }, token);
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await request("/api/me/senha", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  }, token);
}

export async function listEvents(options?: {
  q?: string;
  bairro?: string;
  categoria?: string;
  periodo?: string;
  token?: string | null;
}): Promise<CulturalEvent[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  if (options?.bairro) params.set("bairro", options.bairro);
  if (options?.categoria) {
    params.set(
      "categoria",
      CATEGORY_TO_API[options.categoria] ?? options.categoria,
    );
  }
  if (options?.periodo) params.set("periodo", options.periodo);
  params.set("limit", "100");

  const events = await request<ApiEvent[]>(
    `/api/eventos?${params.toString()}`,
    {},
    options?.token,
  );

  return events.map(mapEvent);
}

export async function favoriteEvent(
  token: string,
  eventId: string,
): Promise<void> {
  await request(`/api/eventos/${eventId}/favorito`, { method: "POST" }, token);
}

export async function unfavoriteEvent(
  token: string,
  eventId: string,
): Promise<void> {
  await request(
    `/api/eventos/${eventId}/favorito`,
    { method: "DELETE" },
    token,
  );
}

export async function listAgenda(token: string): Promise<CulturalEvent[]> {
  const events = await request<ApiEvent[]>("/api/me/agenda", {}, token);
  return events.map(mapEvent);
}

export async function addReview(
  token: string,
  eventId: string,
  rating: 1 | 2 | 3 | 4 | 5,
  comment: string,
): Promise<EventReview> {
  const review = await request<ApiReview>(
    `/api/eventos/${eventId}/avaliacoes`,
    {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    },
    token,
  );

  return {
    id: review.id,
    author: review.author,
    authorId: review.author_id ?? undefined,
    rating: review.rating as 1 | 2 | 3 | 4 | 5,
    comment: review.comment ?? "",
    createdAt: review.created_at,
  };
}

export async function listNotifications(
  token: string,
): Promise<UserNotification[]> {
  const notifications = await request<ApiNotification[]>(
    "/api/me/notificacoes",
    {},
    token,
  );
  return notifications.map(mapNotification);
}

export async function markNotificationsRead(token: string): Promise<void> {
  await request(
    "/api/me/notificacoes/lidas",
    { method: "POST" },
    token,
  );
}

export async function listReports(token: string): Promise<UserReport[]> {
  const reports = await request<ApiReport[]>("/api/me/denuncias", {}, token);
  return reports.map(mapReport);
}

export async function createReport(
  token: string,
  input: {
    eventId: string;
    eventTitle: string;
    targetType: "EVENTO" | "AVALIACAO";
    reviewId?: string;
    reason: string;
    description: string;
  },
): Promise<UserReport> {
  const report = await request<ApiReport>(
    "/api/denuncias",
    {
      method: "POST",
      body: JSON.stringify({
        target_type: input.targetType,
        event_id: input.targetType === "EVENTO" ? input.eventId : undefined,
        review_id: input.reviewId,
        reason: input.reason,
        description: input.description,
      }),
    },
    token,
  );
  return mapReport(report);
}

function apiDates(input: NewEventInput): {
  startsAt: string;
  endsAt: string;
} {
  const [start, end] = input.time.split(" às ");
  const startDate = new Date(`${input.date}T${start || "18:00"}:00-03:00`);
  const endDate = new Date(
    `${input.date}T${end || start || "22:00"}:00-03:00`,
  );

  if (Number.isNaN(startDate.getTime())) {
    const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      startsAt: fallback.toISOString(),
      endsAt: new Date(fallback.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    };
  }

  return {
    startsAt: startDate.toISOString(),
    endsAt: (endDate > startDate ? endDate : new Date(
      startDate.getTime() + 4 * 60 * 60 * 1000,
    )).toISOString(),
  };
}

export async function createEvent(
  token: string,
  input: NewEventInput,
): Promise<CulturalEvent> {
  const dates = apiDates(input);
  const event = await request<ApiEvent>(
    "/api/eventos",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        category: CATEGORY_TO_API[input.category] ?? input.category,
        starts_at: dates.startsAt,
        ends_at: dates.endsAt,
        venue_name: input.location,
        address: input.location,
        neighborhood: input.neighborhood,
        latitude: -2.5297,
        longitude: -44.3028,
        banner_url: input.bannerUrl,
        price_cents: 0,
        is_free: true,
      }),
    },
    token,
  );

  return mapEvent(event);
}

export async function cancelEvent(
  token: string,
  eventId: string,
): Promise<void> {
  await request(
    `/api/eventos/${eventId}/cancelar`,
    { method: "POST" },
    token,
  );
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
