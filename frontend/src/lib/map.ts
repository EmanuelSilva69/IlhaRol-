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

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY as
  | string
  | undefined;

function withCartoKey(url: string, apiKey?: string): string {
  if (!apiKey) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}key=${encodeURIComponent(apiKey)}`;
}

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

export function tileConfigFor(
  theme?: MapTheme,
  apiKey: string | undefined = CARTO_API_KEY,
) {
  const config = THEME_TILES[resolveTheme(theme)];
  return { ...config, url: withCartoKey(config.url, apiKey) };
}
