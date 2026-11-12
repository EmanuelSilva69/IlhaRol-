import { describe, expect, it } from "vitest";

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  normalizeCategory,
  resolveTheme,
  tileConfigFor,
} from "./map";

describe("normalizeCategory", () => {
  it("normaliza acentos e maiúsculas", () => {
    expect(normalizeCategory("Música")).toBe("musica");
    expect(normalizeCategory("TEATRO")).toBe("teatro");
    expect(normalizeCategory("gastronomia")).toBe("gastronomia");
  });

  it("retorna null para categoria desconhecida ou ausente", () => {
    expect(normalizeCategory("cinema")).toBeNull();
    expect(normalizeCategory("")).toBeNull();
    expect(normalizeCategory(undefined)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("usa o modo claro como padrão", () => {
    expect(resolveTheme()).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("thematic")).toBe("thematic");
  });
});

describe("tileConfigFor", () => {
  it("mapeia cada tema para um provedor gratuito com atribuição", () => {
    expect(tileConfigFor("light").url).toContain("light_all");
    expect(tileConfigFor("dark").url).toContain("dark_all");
    expect(tileConfigFor("thematic").url).toContain("light_all");
    expect(tileConfigFor("light").attribution).toContain("OpenStreetMap");
    expect(tileConfigFor("light").attribution).toContain("CARTO");
  });

  it("adiciona a chave da CARTO quando informada", () => {
    expect(tileConfigFor("light", "test-key").url).toContain("key=test-key");
  });

  it("não adiciona chave quando ela está vazia", () => {
    expect(tileConfigFor("light", "").url).not.toContain("key=");
  });
});

describe("padrões do mapa", () => {
  it("centraliza em São Luís com zoom de cidade", () => {
    expect(DEFAULT_CENTER).toEqual([-2.5307, -44.3068]);
    expect(DEFAULT_ZOOM).toBe(13);
  });
});
