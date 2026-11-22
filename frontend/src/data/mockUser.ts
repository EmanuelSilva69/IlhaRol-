import type { UserProfile, UserReport } from "../types/event";

export const INITIAL_USER_PROFILE: UserProfile = {
  id: "user-emanuel",
  organizerId: "user-emanuel",
  name: "Emanuel Lopes",
  email: "emanuel.silva@ufma.br",
  neighborhood: "Centro Histórico",
  interests: [
    "Bumba Meu Boi",
    "Música e reggae",
    "Tambor de Crioula",
    "Cinema",
  ],
  bio: "Estudante, produtor cultural independente e apaixonado pela cultura popular maranhense.",
  role: "producer",
  memberSince: "2026-11-01",
  notificationPreferences: {
    newEvents: true,
    eventChanges: true,
    weeklySummary: false,
  },
};

export const INITIAL_USER_REPORTS: UserReport[] = [
  {
    id: "report-demo-1",
    eventId: "musica-2",
    eventTitle: "Noite do Reggae de Radiola na Lagoa",
    targetType: "EVENTO",
    reason: "INFORMACAO_FALSA",
    description:
      "Horário de encerramento divergente do que foi divulgado pelo organizador.",
    createdAt: "12/11/2026 15:20",
    status: "EM_ANALISE",
  },
];
