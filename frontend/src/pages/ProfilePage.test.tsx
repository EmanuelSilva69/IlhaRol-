import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { INITIAL_EVENTS, INITIAL_NOTIFICATIONS } from "../data/mockEvents";
import {
  INITIAL_USER_PROFILE,
  INITIAL_USER_REPORTS,
} from "../data/mockUser";
import ProfilePage from "./ProfilePage";

function renderProfile() {
  const onUpdateProfile = vi.fn();
  const onMarkAllAlertsRead = vi.fn();
  const onToggleFavorite = vi.fn();
  const onChangePassword = vi.fn().mockResolvedValue(undefined);
  const onLogout = vi.fn();

  render(
    <ProfilePage
      profile={INITIAL_USER_PROFILE}
      events={INITIAL_EVENTS}
      notifications={INITIAL_NOTIFICATIONS}
      reports={INITIAL_USER_REPORTS}
      onUpdateProfile={onUpdateProfile}
      onMarkAllAlertsRead={onMarkAllAlertsRead}
      onToggleFavorite={onToggleFavorite}
      onChangePassword={onChangePassword}
      onLogout={onLogout}
    />,
  );

  return {
    onUpdateProfile,
    onMarkAllAlertsRead,
    onToggleFavorite,
    onChangePassword,
    onLogout,
  };
}

describe("ProfilePage", () => {
  it("mostra o resumo, os indicadores e as seções do perfil", () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Emanuel Lopes" })).toBeInTheDocument();
    expect(screen.getByText("Produtor cultural")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /meus dados/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /minha agenda/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /avaliações/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /meus eventos/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /notificações & alertas/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /denúncias/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /segurança/i })).toBeInTheDocument();
  });

  it("lista os eventos salvos na aba Minha agenda", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /minha agenda/i }));

    expect(
      screen.getByText("Roda de Tambor de Crioula e Samba na Praça Nauro Machado"),
    ).toBeInTheDocument();
  });

  it("lista as avaliações feitas pelo usuário", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /avaliações/i }));

    expect(
      screen.getByText("Feirinha São Luís — Edição Especial Culinária & Artesanato"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Feira muito bem organizada, com boa circulação e atrações para toda a família.",
      ),
    ).toBeInTheDocument();
  });

  it("lista os eventos publicados pelo usuário", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /meus eventos/i }));

    expect(
      screen.getByText("Roda de Samba do IlhaRolê — Edição de Dezembro"),
    ).toBeInTheDocument();
  });

  it("lista as denúncias registradas", () => {
    renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /denúncias/i }));

    expect(
      screen.getByText("Noite do Reggae de Radiola na Lagoa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
  });

  it("envia as alterações do perfil", () => {
    const { onUpdateProfile } = renderProfile();

    const nameInput = screen.getByLabelText("Nome completo");
    fireEvent.change(nameInput, { target: { value: "Ana Belfort" } });
    fireEvent.click(
      screen.getByRole("button", { name: /salvar alterações/i }),
    );

    expect(onUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana Belfort" }),
    );
  });

  it("atualiza preferências de alerta", () => {
    const { onUpdateProfile } = renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /notificações & alertas/i }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: /resumo semanal/i }),
    );

    expect(onUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationPreferences: expect.objectContaining({
          weeklySummary: true,
        }),
      }),
    );
  });

  it("aciona o logout pelo atalho do resumo", () => {
    const { onLogout } = renderProfile();

    fireEvent.click(screen.getByRole("button", { name: /sair da conta/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("altera a senha pela API", async () => {
    const { onChangePassword } = renderProfile();

    fireEvent.click(screen.getByRole("tab", { name: /segurança/i }));
    fireEvent.change(screen.getByLabelText("Senha atual"), {
      target: { value: "demo1234" },
    });
    fireEvent.change(screen.getByLabelText("Nova senha"), {
      target: { value: "novaSenha123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "novaSenha123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /alterar senha/i }));

    await waitFor(() => {
      expect(onChangePassword).toHaveBeenCalledWith(
        "demo1234",
        "novaSenha123",
      );
    });
  });
});
