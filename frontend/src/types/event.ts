export type EventCategory = "musica" | "teatro" | "gastronomia";

export type MapTheme = "light" | "dark" | "thematic";

export interface MapEvent {
  id: string;
  title: string;
  category: EventCategory | string;
  latitude: number;
  longitude: number;
}
