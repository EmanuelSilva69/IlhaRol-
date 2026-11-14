import L from "leaflet";

import bumbaSvg from "../assets/markers/bumba.svg?raw";
import gastronomySvg from "../assets/markers/gastronomy.svg?raw";
import museumSvg from "../assets/markers/museum.svg?raw";
import reggaeSvg from "../assets/markers/reggae.svg?raw";
import theaterSvg from "../assets/markers/theater.svg?raw";
import { normalizeCategory } from "./map";
import type { EventCategory, MapEvent } from "../types/event";

const NEUTRAL_MARKER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 52" width="44" height="52" aria-hidden="true" focusable="false">
  <path d="M22 1.5C10.7 1.5 1.5 10.7 1.5 22c0 14.2 20.5 28.5 20.5 28.5S42.5 36.2 42.5 22C42.5 10.7 33.3 1.5 22 1.5Z" fill="#64748b" stroke="#ffffff" stroke-width="2" />
  <circle cx="22" cy="22" r="13" fill="#f1f5f9" />
  <circle cx="22" cy="22" r="4" fill="#64748b" />
</svg>`;

const CATEGORY_LABELS: Record<EventCategory, string> = {
  bumba: "Bumba Meu Boi",
  musica: "Música, reggae e shows",
  teatro: "Teatro",
  gastronomia: "Gastronomia",
  museu: "Museus e exposições",
};

const CATEGORY_SVGS: Record<EventCategory, string> = {
  bumba: bumbaSvg,
  musica: reggaeSvg,
  teatro: theaterSvg,
  gastronomia: gastronomySvg,
  museu: museumSvg,
};

interface MarkerMetrics {
  width: number;
  height: number;
  anchor: [number, number];
}

const MARKER_METRICS: Record<EventCategory, MarkerMetrics> = {
  bumba: { width: 80, height: 80, anchor: [40, 77] },
  musica: { width: 56, height: 56, anchor: [28, 53] },
  teatro: { width: 40, height: 40, anchor: [20, 38] },
  gastronomia: { width: 40, height: 40, anchor: [20, 38] },
  museu: { width: 32, height: 32, anchor: [16, 30] },
};

const NEUTRAL_METRICS: MarkerMetrics = { width: 44, height: 52, anchor: [22, 50] };

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

export function markerMetricsFor(
  category: string | null | undefined,
): MarkerMetrics {
  const normalized = normalizeCategory(category);
  return normalized ? MARKER_METRICS[normalized] : NEUTRAL_METRICS;
}

export function eventLabel(event: MapEvent): string {
  return `${event.title} — ${categoryLabel(event.category)}`;
}

export function createEventIcon(event: MapEvent): L.DivIcon {
  const label = eventLabel(event);
  const safeLabel = escapeHtml(label);
  const metrics = markerMetricsFor(event.category);

  return L.divIcon({
    html: `<div class="event-marker-inner" role="img" aria-label="${safeLabel}" title="${safeLabel}">${markerSvgFor(event.category)}</div>`,
    className: "event-marker",
    iconSize: [metrics.width, metrics.height],
    iconAnchor: metrics.anchor,
  });
}
