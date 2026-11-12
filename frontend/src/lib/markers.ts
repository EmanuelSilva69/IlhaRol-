import L from "leaflet";

import gastronomySvg from "../assets/markers/gastronomy.svg?raw";
import musicSvg from "../assets/markers/music.svg?raw";
import theaterSvg from "../assets/markers/theater.svg?raw";
import { normalizeCategory } from "./map";
import type { EventCategory, MapEvent } from "../types/event";

const NEUTRAL_MARKER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 52" width="44" height="52" aria-hidden="true" focusable="false">
  <path d="M22 1.5C10.7 1.5 1.5 10.7 1.5 22c0 14.2 20.5 28.5 20.5 28.5S42.5 36.2 42.5 22C42.5 10.7 33.3 1.5 22 1.5Z" fill="#64748b" stroke="#ffffff" stroke-width="2" />
  <circle cx="22" cy="22" r="13" fill="#f1f5f9" />
  <circle cx="22" cy="22" r="4" fill="#64748b" />
</svg>`;

const CATEGORY_LABELS: Record<EventCategory, string> = {
  musica: "Música",
  teatro: "Teatro",
  gastronomia: "Gastronomia",
};

const CATEGORY_SVGS: Record<EventCategory, string> = {
  musica: musicSvg,
  teatro: theaterSvg,
  gastronomia: gastronomySvg,
};

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}

export function categoryLabel(category: string | null | undefined): string {
  const normalized = normalizeCategory(category);
  return normalized ? CATEGORY_LABELS[normalized] : "Outra categoria";
}

export function markerSvgFor(category: string | null | undefined): string {
  const normalized = normalizeCategory(category);
  return normalized ? CATEGORY_SVGS[normalized] : NEUTRAL_MARKER;
}

export function eventLabel(event: MapEvent): string {
  return `${event.title} — ${categoryLabel(event.category)}`;
}

export function createEventIcon(event: MapEvent): L.DivIcon {
  const label = eventLabel(event);
  const safeLabel = escapeHtml(label);

  return L.divIcon({
    html: `<div class="event-marker-inner" role="img" aria-label="${safeLabel}" title="${safeLabel}">${markerSvgFor(event.category)}</div>`,
    className: "event-marker",
    iconSize: [44, 52],
    iconAnchor: [22, 50],
  });
}
