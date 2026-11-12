import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EventMap from "./EventMap";

describe("EventMap", () => {
  it("renderiza o contêiner acessível do mapa", () => {
    render(<EventMap />);

    expect(
      screen.getByRole("region", {
        name: "Mapa de eventos culturais em São Luís",
      }),
    ).toBeInTheDocument();
  });

  it("aplica o tema informado ao contêiner", async () => {
    render(<EventMap theme="dark" />);

    const map = screen.getByRole("region", {
      name: "Mapa de eventos culturais em São Luís",
    });

    await waitFor(() => {
      expect(map).toHaveAttribute("data-theme", "dark");
    });
  });
});
