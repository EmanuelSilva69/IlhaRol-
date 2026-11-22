import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { INITIAL_USER_PROFILE } from "../data/mockUser";
import { login as apiLogin, register as apiRegister } from "../lib/api";
import LoginPage from "./LoginPage";

vi.mock("../lib/api", () => ({
  isApiError: vi.fn(() => false),
  forgotPassword: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

const authResult = {
  token: "jwt-token",
  profile: INITIAL_USER_PROFILE,
};

describe("LoginPage", () => {
  it("autentica pela API e entrega o token/perfil ao App", async () => {
    vi.mocked(apiLogin).mockResolvedValue(authResult);
    const onLogin = vi.fn();

    render(<LoginPage onLogin={onLogin} />);
    fireEvent.change(
      screen.getByLabelText("E-mail cadastrado", {
        selector: "input#login-email",
      }),
      {
        target: { value: "produtor@example.com" },
      },
    );
    fireEvent.change(
      screen.getByLabelText("Senha", { selector: "input#login-password" }),
      {
        target: { value: "demo1234" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /entrar \(rf01a\)/i }));

    await waitFor(() => {
      expect(apiLogin).toHaveBeenCalledWith(
        "produtor@example.com",
        "demo1234",
      );
    });
    expect(onLogin).toHaveBeenCalledWith(authResult);
  });

  it("preenche a conta de demonstração", () => {
    render(<LoginPage onLogin={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /preencher conta demo/i }),
    );

    expect(
      screen.getByLabelText("E-mail cadastrado", {
        selector: "input#login-email",
      }),
    ).toHaveValue("produtor@example.com");
    expect(
      screen.getByLabelText("Senha", { selector: "input#login-password" }),
    ).toHaveValue("demo1234");
  });

  it("cadastra produtor cultural pela API", async () => {
    vi.mocked(apiRegister).mockResolvedValue(authResult);
    const onLogin = vi.fn();

    render(<LoginPage onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText("Nome completo"), {
      target: { value: "Produtora Teste" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "produtora@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText("Senha", {
        selector: "input#register-password",
      }),
      {
        target: { value: "senha12345" },
      },
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: /sou produtor cultural/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => {
      expect(apiRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "produtora@example.com",
          role: "producer",
        }),
      );
    });
    expect(onLogin).toHaveBeenCalledWith(authResult);
  });
});
