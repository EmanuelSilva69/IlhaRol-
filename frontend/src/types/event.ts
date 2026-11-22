export type EventCategory =
  | "bumba"
  | "musica"
  | "teatro"
  | "gastronomia"
  | "museu"
  | "tambor"
  | "samba"
  | "orla"
  | "feirinha"
  | "cinema";

export type MapTheme = "light" | "dark" | "thematic";

export type EventStatus = "ATIVO" | "CANCELADO" | "REALIZADO";

export type NotificationType =
  | "NOVO_EVENTO_COMPATIVEL"
  | "ALTERACAO_EVENTO"
  | "CANCELAMENTO_EVENTO";

export interface EventReview {
  id: string;
  author: string;
  authorId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
}

export type UserRole = "visitor" | "producer" | "admin";

export interface NotificationPreferences {
  newEvents: boolean;
  eventChanges: boolean;
  weeklySummary: boolean;
}

export interface UserProfile {
  id: string;
  organizerId: string;
  name: string;
  email: string;
  neighborhood: string;
  interests: string[];
  bio: string;
  role: UserRole;
  memberSince: string;
  notificationPreferences: NotificationPreferences;
}

export type ReportTarget = "EVENTO" | "AVALIACAO";

export interface UserReport {
  id: string;
  eventId: string;
  eventTitle: string;
  targetType: ReportTarget;
  reviewId?: string;
  reason: string;
  description: string;
  createdAt: string;
  status: "EM_ANALISE";
}

export interface MapEvent {
  id: string;
  title: string;
  category: EventCategory | string;
  latitude: number;
  longitude: number;
}

export interface NewEventInput {
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  neighborhood: string;
  bannerUrl: string;
}

export interface CulturalEvent extends MapEvent {
  description: string;
  date: string;
  time: string;
  location: string;
  neighborhood: string;
  bannerUrl: string;
  organizer: string;
  organizerId: string;
  status: EventStatus;
  isFavorite: boolean;
  reviews: EventReview[];
}

export interface UserNotification {
  id: string;
  eventId: string;
  eventTitle: string;
  type: NotificationType;
  content: string;
  createdAt: string;
  read: boolean;
}