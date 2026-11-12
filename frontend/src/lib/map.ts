import type { EventCategory, MapTheme } from "../types/event";

export const DEFAULT_CENTER: [number, number] = [-2.5307, -44.3068];
export const DEFAULT_ZOOM = 13;

export const THEME_TILES: Record<
  MapTheme,
  { url: string; attribution: string }
> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  thematic: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

const CATEGORY_ALIASES: Record<string, EventCategory> = {
  musica: "musica",
  teatro: "teatro",
  gastronomia: "gastronomia",
};

export function normalizeCategory(
  value: string | null | undefined,
): EventCategory | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return CATEGORY_ALIASES[normalized] ?? null;
}

export function resolveTheme(theme?: MapTheme): MapTheme {
  return theme ?? "light";
}

export function tileConfigFor(theme?: MapTheme) {
  return THEME_TILES[resolveTheme(theme)];
}
