import { type FormEvent, useCallback, useState } from "react";

import RfBadge from "../components/RfBadge";
import Toast from "../components/Toast";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import type { UserNotification } from "../types/event";

interface ProfilePageProps {
  userName: string;
  notifications: UserNotification[];
  onMarkAllAlertsRead: () => void;
}

const INTERESTS = [
  "Bumba Meu Boi",
  "Música e reggae",
  "Teatro",
  "Gastronomia",
  "Museus",
  "Tambor de Crioula",
  "Samba e pagode",
  "Orla e praia",
  "Feirinhas",
  "Cinema",
];

export function ProfilePage({
  userName,
  notifications,
  onMarkAllAlertsRead,
}: ProfilePageProps) {
  const [name, setName] = useState(userName);
  const [email] = useState("emanuel.silva@ufma.br");
  const [neighborhood, setNeighborhood] = useState("Centro Histórico");
  const [interests, setInterests] = useState<string[]>([
    "Bumba Meu Boi",
    "Música e reggae",
    "Tambor de Crioula",
    "Cinema",
  ]);
  const [newEventsAlert, setNewEventsAlert] = useState(true);
  const [changesAlert, setChangesAlert] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const unreadAlerts = notifications.filter((notification) => !notification.read);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest],
    );
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(
      `Perfil atualizado. Bairro e interesses serão usados na seleção dos alertas (RF01b / RF08 / RF12).`,
    );
    setToast("Perfil atualizado com sucesso (RF01b)");
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 6"
        screenTitle="Perfil, Preferências Culturais e Alertas"
        rfs={["RF01b", "RF08", "RF12"]}
        rnfs={["RNF06"]}
        userStories={["US01", "US09"]}
        description="Permite consultar e atualizar nome, bairro e interesses culturais do próprio perfil. As preferências alimentam os alertas de novos eventos compatíveis e podem ser ativadas ou desativadas separadamente."
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <section className="border-2 border-black bg-white p-5">
          <div className="border-b border-black pb-2">
            <h2 className="text-sm font-black uppercase tracking-wide">
              Dados do perfil (RF01b)
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              O usuário só edita o próprio perfil. As alterações são salvas e
              usadas na seleção dos alertas.
            </p>
          </div>

          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-bold uppercase"
                >
                  Nome completo
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-bold uppercase"
                >
                  E-mail (somente leitura)
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className="mt-1 w-full border-2 border-black bg-neutral-100 px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-neighborhood"
                className="block text-xs font-bold uppercase"
              >
                Bairro de interesse
              </label>
              <select
                id="profile-neighborhood"
                value={neighborhood}
                onChange={(event) => setNeighborhood(event.target.value)}
                className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs"
              >
                {SAO_LUIS_NEIGHBORHOODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-xs font-bold uppercase">
                Preferências culturais
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[11px]">
                {INTERESTS.map((interest) => (
                  <label
                    key={interest}
                    className="flex cursor-pointer items-center gap-1.5 border border-neutral-300 px-1.5 py-1"
                  >
                    <input
                      type="checkbox"
                      checked={interests.includes(interest)}
                      onChange={() => toggleInterest(interest)}
                      className="accent-black"
                    />
                    {interest}
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="w-full cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
            >
              Salvar alterações (RF01b)
            </button>
          </form>

          {feedback && (
            <p
              role="status"
              className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
            >
              {feedback}
            </p>
          )}
        </section>

        <div className="space-y-4">
          <section className="border-2 border-black bg-white p-5">
            <h2 className="text-sm font-black uppercase tracking-wide">
              Preferências de alertas (RF12)
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              Ative ou desative separadamente cada tipo de notificação. As
              escolhas não removem eventos da agenda.
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 border border-black bg-neutral-50 p-3">
                <input
                  type="checkbox"
                  checked={newEventsAlert}
                  onChange={(event) => setNewEventsAlert(event.target.checked)}
                  className="mt-0.5 accent-black"
                />
                <span>
                  <span className="block text-xs font-black uppercase">
                    Novos eventos compatíveis (RF08)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-neutral-700">
                    Avisos de eventos no seu bairro ou nas categorias de
                    interesse.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 border border-black bg-neutral-50 p-3">
                <input
                  type="checkbox"
                  checked={changesAlert}
                  onChange={(event) => setChangesAlert(event.target.checked)}
                  className="mt-0.5 accent-black"
                />
                <span>
                  <span className="block text-xs font-black uppercase">
                    Alterações e cancelamentos (RF11)
                  </span>
                  <span className="mt-0.5 block text-[11px] text-neutral-700">
                    Avisos sobre eventos que você salvou na agenda.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="border-2 border-black bg-amber-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2">
              <h2 className="text-sm font-black uppercase tracking-wide">
                Notificações ({unreadAlerts.length} não lidas)
              </h2>
              <button
                type="button"
                onClick={onMarkAllAlertsRead}
                className="cursor-pointer border border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase hover:bg-neutral-100"
              >
                Marcar todas como lidas
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`border border-black p-2.5 text-xs ${
                    notification.read ? "bg-white" : "bg-amber-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase">
                      {notification.type === "CANCELAMENTO_EVENTO"
                        ? "Cancelamento"
                        : notification.type === "ALTERACAO_EVENTO"
                          ? "Alteração"
                          : "Novo evento compatível"}
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {notification.createdAt}
                    </span>
                  </div>
                  <p className="mt-0.5 font-bold">{notification.eventTitle}</p>
                  <p className="mt-1 text-neutral-700">{notification.content}</p>
                  <a
                    href={`#/evento/${notification.eventId}`}
                    className="mt-1.5 inline-block text-[11px] font-black underline"
                  >
                    Abrir detalhes (RF08 / RF11)
                  </a>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}

export default ProfilePage;
