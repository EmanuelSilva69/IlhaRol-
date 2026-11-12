import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  createEventIcon,
  escapeHtml,
  markerSvgFor,
} from "./markers";

describe("markerSvgFor", () => {
  it("escolhe o SVG de cada categoria", () => {
    expect(markerSvgFor("Música")).toContain("ir-music-note");
    expect(markerSvgFor("TEATRO")).toContain("ir-theater-left");
    expect(markerSvgFor("gastronomia")).toContain("ir-gastronomy-plate");
  });

  it("usa marcador neutro para categoria desconhecida", () => {
    expect(markerSvgFor("cinema")).toContain("#64748b");
    expect(markerSvgFor(undefined)).toContain("#64748b");
  });
});

describe("categoryLabel", () => {
  it("rotula categorias conhecidas e desconhecidas", () => {
    expect(categoryLabel("Música")).toBe("Música");
    expect(categoryLabel("teatro")).toBe("Teatro");
    expect(categoryLabel("GASTRONOMIA")).toBe("Gastronomia");
    expect(categoryLabel("cinema")).toBe("Outra categoria");
  });
});

describe("escapeHtml", () => {
  it("escapa caracteres que poderiam injetar HTML", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });
});

describe("createEventIcon", () => {
  it("monta um divIcon acessível com título e categoria escapados", () => {
    const icon = createEventIcon({
      id: "1",
      title: '<img src=x onerror="alert(1)">',
      category: "musica",
      latitude: -2.53,
      longitude: -44.3,
    });

    expect(icon.options.className).toBe("event-marker");
    expect(icon.options.iconSize).toEqual([44, 52]);
    expect(icon.options.iconAnchor).toEqual([22, 50]);
    expect(icon.options.html).toContain("&lt;img src=x");
    expect(icon.options.html).not.toContain("<img src=x");
    expect(icon.options.html).toContain("Música");
    expect(icon.options.html).toContain("ir-music-note");
  });
});
