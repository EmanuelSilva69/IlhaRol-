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
  bumba: "bumba",
  boi: "bumba",
  "bumba-meu-boi": "bumba",
  "bumba meu boi": "bumba",
  "cultura-popular": "bumba",
  "cultura popular": "bumba",
  musica: "musica",
  musicas: "musica",
  reggae: "musica",
  show: "musica",
  shows: "musica",
  festa: "musica",
  festas: "musica",
  "casa-de-reggae": "musica",
  "casas-de-reggae": "musica",
  "casa de reggae": "musica",
  "casas de reggae": "musica",
  teatro: "teatro",
  "artes-cenicas": "teatro",
  "artes cenicas": "teatro",
  gastronomia: "gastronomia",
  bar: "gastronomia",
  bares: "gastronomia",
  comida: "gastronomia",
  restaurante: "gastronomia",
  museu: "museu",
  museus: "museu",
  exposicao: "museu",
  exposicoes: "museu",
  "passeio-historico": "museu",
  "passeios-historicos": "museu",
  historico: "museu",
  patrimonio: "museu",
  tambor: "tambor",
  "tambor-de-crioula": "tambor",
  "tambor de crioula": "tambor",
  crioula: "tambor",
  samba: "samba",
  pagode: "samba",
  "roda-de-samba": "samba",
  "roda de samba": "samba",
  "roda-de-pagode": "samba",
  "roda de pagode": "samba",
  orla: "orla",
  praia: "orla",
  litoral: "orla",
  litoranea: "orla",
  espigao: "orla",
  lazer: "orla",
  feirinha: "feirinha",
  feira: "feirinha",
  feiras: "feirinha",
  artesanato: "feirinha",
  buriti: "feirinha",
  "feira-cultural": "feirinha",
  "feira cultural": "feirinha",
  cinema: "cinema",
  cinemas: "cinema",
  audiovisual: "cinema",
  filme: "cinema",
  filmes: "cinema",
  "festival-audiovisual": "cinema",
  "festival audiovisual": "cinema",
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
