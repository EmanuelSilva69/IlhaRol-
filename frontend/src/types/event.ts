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
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
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