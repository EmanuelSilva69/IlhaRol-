import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  createEventIcon,
  escapeHtml,
  markerMetricsFor,
  markerSvgFor,
} from "./markers";

describe("markerSvgFor", () => {
  it("escolhe o SVG de cada categoria", () => {
    expect(markerSvgFor("Bumba Meu Boi")).toContain("ir-bumba-aura");
    expect(markerSvgFor("Música")).toContain("ir-reggae-wave");
    expect(markerSvgFor("TEATRO")).toContain("ir-teatro-left");
    expect(markerSvgFor("gastronomia")).toContain("ir-gastro-steam");
    expect(markerSvgFor("Museus")).toContain("ir-museu-fade");
  });

  it("usa marcador neutro para categoria desconhecida", () => {
    expect(markerSvgFor("cinema")).toContain("#64748b");
    expect(markerSvgFor(undefined)).toContain("#64748b");
  });
});

describe("markerMetricsFor", () => {
  it("respeita a hierarquia de tamanho dos marcadores", () => {
    expect(markerMetricsFor("bumba")).toEqual({
      width: 80,
      height: 80,
      anchor: [40, 77],
    });
    expect(markerMetricsFor("musica").width).toBe(56);
    expect(markerMetricsFor("reggae").width).toBe(56);
    expect(markerMetricsFor("teatro").width).toBe(40);
    expect(markerMetricsFor("gastronomia").width).toBe(40);
    expect(markerMetricsFor("museu").width).toBe(32);
  });

  it("usa o tamanho neutro para categoria desconhecida", () => {
    expect(markerMetricsFor("cinema")).toEqual({
      width: 44,
      height: 52,
      anchor: [22, 50],
    });
  });
});

describe("categoryLabel", () => {
  it("rotula categorias conhecidas e desconhecidas", () => {
    expect(categoryLabel("Bumba Meu Boi")).toBe("Bumba Meu Boi");
    expect(categoryLabel("Música")).toBe("Música, reggae e shows");
    expect(categoryLabel("teatro")).toBe("Teatro");
    expect(categoryLabel("GASTRONOMIA")).toBe("Gastronomia");
    expect(categoryLabel("museus")).toBe("Museus e exposições");
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
  it("monta um divIcon acessível com o tamanho da categoria", () => {
    const icon = createEventIcon({
      id: "1",
      title: '<img src=x onerror="alert(1)">',
      category: "bumba",
      latitude: -2.53,
      longitude: -44.3,
    });

    expect(icon.options.className).toBe("event-marker");
    expect(icon.options.iconSize).toEqual([80, 80]);
    expect(icon.options.iconAnchor).toEqual([40, 77]);
    expect(icon.options.html).toContain("&lt;img src=x");
    expect(icon.options.html).not.toContain("<img src=x");
    expect(icon.options.html).toContain("Bumba Meu Boi");
    expect(icon.options.html).toContain("ir-bumba-aura");
  });
});
