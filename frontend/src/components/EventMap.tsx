import L from "leaflet";
import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";
import "./EventMap.css";

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  resolveTheme,
  tileConfigFor,
} from "../lib/map";
import { createEventIcon, eventLabel } from "../lib/markers";
import type { MapEvent, MapTheme } from "../types/event";

interface EventMapProps {
  events?: MapEvent[];
  theme?: MapTheme;
  center?: [number, number];
  zoom?: number;
}

export function EventMap({
  events = [],
  theme,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    const map = L.map(container, {
      center,
      zoom,
      zoomControl: true,
    });

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
    };
    // O mapa é criado uma única vez; mudanças de centro/zoom não recriam a instância.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const config = tileConfigFor(theme);

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 19,
    }).addTo(map);

    map.getContainer().dataset.theme = resolveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) {
      return;
    }

    layer.clearLayers();

    for (const event of events) {
      if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) {
        continue;
      }

      L.marker([event.latitude, event.longitude], {
        icon: createEventIcon(event),
        keyboard: true,
        title: eventLabel(event),
      }).addTo(layer);
    }
  }, [events]);

  return (
    <div
      ref={containerRef}
      className="event-map"
      role="region"
      aria-label="Mapa de eventos culturais em São Luís"
    />
  );
}

export default EventMap;
