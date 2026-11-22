import { type FormEvent, useState } from "react";

import RfBadge from "../components/RfBadge";
import { SAO_LUIS_NEIGHBORHOODS } from "../data/mockEvents";
import {
  forgotPassword,
  isApiError,
  login as apiLogin,
  register as apiRegister,
  type AuthResult,
} from "../lib/api";

interface LoginPageProps {
  onLogin: (result: AuthResult) => void;
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

export function LoginPage({ onLogin }: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);
  const [loginError, setLoginError] = useState(false);
  const [loginShake, setLoginShake] = useState(0);

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerNeighborhood, setRegisterNeighborhood] = useState<string>(
    SAO_LUIS_NEIGHBORHOODS[0],
  );
  const [registerInterests, setRegisterInterests] = useState<string[]>([
    "Bumba Meu Boi",
    "Música e reggae",
  ]);
  const [registerIsProducer, setRegisterIsProducer] = useState(false);
  const [registerFeedback, setRegisterFeedback] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState(false);
  const [registerShake, setRegisterShake] = useState(0);

  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryFeedback, setRecoveryFeedback] = useState<string | null>(null);

  const toggleInterest = (interest: string) => {
    setRegisterInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest],
    );
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError(true);
      setLoginShake((current) => current + 1);
      setLoginFeedback(
        "Informe e-mail e senha para autenticar. Credenciais inválidas são rejeitadas (RF01a).",
      );
      return;
    }

    setLoginError(false);

    try {
      const result = await apiLogin(loginEmail.trim(), loginPassword);
      onLogin(result);
      setLoginFeedback(
        `Sessão iniciada com sucesso para ${result.profile.name}. Token JWT ativo (RF01a).`,
      );
    } catch (error) {
      setLoginError(true);
      setLoginShake((current) => current + 1);
      setLoginFeedback(
        isApiError(error)
          ? error.message
          : "Não foi possível conectar à API. Verifique se o back-end está no ar.",
      );
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setRegisterError(true);
      setRegisterShake((current) => current + 1);
      setRegisterFeedback(
        "Preencha nome, e-mail e senha. E-mails já cadastrados são bloqueados (RF01a).",
      );
      return;
    }
    if (registerPassword.length < 8) {
      setRegisterError(true);
      setRegisterShake((current) => current + 1);
      setRegisterFeedback("A senha deve ter pelo menos 8 caracteres (RNF03).");
      return;
    }

    setRegisterError(false);

    try {
      const result = await apiRegister({
        name: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
        neighborhood: registerNeighborhood,
        interests: registerInterests,
        role: registerIsProducer ? "producer" : "visitor",
      });
      onLogin(result);
      setRegisterFeedback(
        `Conta criada para ${result.profile.name}. Perfil e preferências salvos no banco (RF01a / RF01b).`,
      );
    } catch (error) {
      setRegisterError(true);
      setRegisterShake((current) => current + 1);
      setRegisterFeedback(
        isApiError(error)
          ? error.message
          : "Não foi possível cadastrar agora. Verifique a API e tente novamente.",
      );
    }
  };

  const handleRecovery = async (event: FormEvent) => {
    event.preventDefault();

    if (!recoveryEmail.trim()) {
      setRecoveryFeedback(
        "Informe o e-mail cadastrado para receber o link de redefinição (RF09).",
      );
      return;
    }

    try {
      const result = await forgotPassword(recoveryEmail.trim());
      setRecoveryFeedback(
        result.reset_token
          ? `${result.message} Token de desenvolvimento: ${result.reset_token}`
          : result.message,
      );
    } catch (error) {
      setRecoveryFeedback(
        isApiError(error)
          ? error.message
          : "Não foi possível solicitar a recuperação agora.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <RfBadge
        screenNumber="Tela 3"
        screenTitle="Autenticação, Cadastro e Recuperação de Acesso"
        rfs={["RF01a", "RF01b", "RF09"]}
        rnfs={["RNF02", "RNF06"]}
        userStories={["US01"]}
        description="Centraliza entrada, criação de conta com bairro e interesses culturais e solicitação de redefinição de senha por link de uso único. Simula a sessão JWT e mantém o acesso às áreas restritas do protótipo."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-2 border-black bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Entrar na conta (RF01a)
          </h2>
          <p className="mt-1 text-xs text-neutral-600">
            Ações de perfil, favoritos, avaliações, agenda e denúncias exigem
            autenticação.
          </p>

          <form
            onSubmit={handleLogin}
            onAnimationEnd={() => setLoginShake(0)}
            className={`mt-4 space-y-3 ${loginShake ? "anim-shake" : ""}`}
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold uppercase"
              >
                E-mail cadastrado
              </label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                aria-invalid={loginError}
                className={`mt-1 w-full border-2 px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                  loginError ? "border-red-700 bg-red-50" : "border-black"
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase"
              >
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="••••••••"
                aria-invalid={loginError}
                className={`mt-1 w-full border-2 px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                  loginError ? "border-red-700 bg-red-50" : "border-black"
                }`}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="submit"
                className="w-full cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white hover:bg-neutral-800"
              >
                Entrar (RF01a)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail("produtor@example.com");
                  setLoginPassword("demo1234");
                }}
                className="w-full cursor-pointer border-2 border-black bg-amber-200 px-4 py-2 text-xs font-black uppercase text-black hover:bg-amber-300"
              >
                Preencher conta demo
              </button>
            </div>
            <p className="text-[11px] text-neutral-600">
              Conta de demonstração: <strong>produtor@example.com</strong> /{" "}
              <strong>demo1234</strong>
            </p>
          </form>

          {loginFeedback && (
            <p
              role="status"
              className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
            >
              {loginFeedback}
            </p>
          )}

          <p className="mt-4 text-xs text-neutral-600">
            Ainda não tem conta?{" "}
            <a href="#/login" className="font-black underline">
              Use o formulário de cadastro ao lado
            </a>
            .
          </p>
        </section>

        <section className="border-2 border-black bg-white p-5">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Criar conta (RF01a)
          </h2>
          <p className="mt-1 text-xs text-neutral-600">
            O bairro e os interesses informados alimentam os alertas de novos
            eventos compatíveis (RF08).
          </p>

          <form
            onSubmit={handleRegister}
            onAnimationEnd={() => setRegisterShake(0)}
            className={`mt-4 space-y-3 ${registerShake ? "anim-shake" : ""}`}
          >
            <div>
              <label
                htmlFor="register-name"
                className="block text-xs font-bold uppercase"
              >
                Nome completo
              </label>
              <input
                id="register-name"
                type="text"
                value={registerName}
                onChange={(event) => setRegisterName(event.target.value)}
                placeholder="Seu nome completo"
                aria-invalid={registerError}
                className={`mt-1 w-full border-2 px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                  registerError ? "border-red-700 bg-red-50" : "border-black"
                }`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-bold uppercase"
                >
                  E-mail
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(event) => setRegisterEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  aria-invalid={registerError}
                  className={`mt-1 w-full border-2 px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                    registerError ? "border-red-700 bg-red-50" : "border-black"
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-bold uppercase"
                >
                  Senha
                </label>
                <input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  aria-invalid={registerError}
                  className={`mt-1 w-full border-2 px-3 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                    registerError ? "border-red-700 bg-red-50" : "border-black"
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="register-neighborhood"
                className="block text-xs font-bold uppercase"
              >
                Bairro de São Luís
              </label>
              <select
                id="register-neighborhood"
                value={registerNeighborhood}
                onChange={(event) =>
                  setRegisterNeighborhood(event.target.value)
                }
                className="mt-1 w-full border-2 border-black bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                {SAO_LUIS_NEIGHBORHOODS.map((neighborhood) => (
                  <option key={neighborhood} value={neighborhood}>
                    {neighborhood}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-2 border border-black bg-neutral-50 p-2 text-[11px]">
              <input
                type="checkbox"
                checked={registerIsProducer}
                onChange={(event) =>
                  setRegisterIsProducer(event.target.checked)
                }
                className="mt-0.5 accent-black"
              />
              <span>
                <strong className="block uppercase">
                  Sou produtor cultural
                </strong>
                Quero publicar e gerenciar eventos na plataforma (RF02 / RF07).
              </span>
            </label>

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
                      checked={registerInterests.includes(interest)}
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
              className="w-full cursor-pointer border-2 border-black bg-amber-200 px-4 py-2 text-xs font-black uppercase text-black hover:bg-amber-300"
            >
              Criar conta (RF01a)
            </button>
          </form>

          {registerFeedback && (
            <p
              role="status"
              className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
            >
              {registerFeedback}
            </p>
          )}
        </section>
      </div>

      <section className="border-2 border-dashed border-black bg-neutral-50 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide">
          Recuperar acesso (RF09)
        </h2>
        <p className="mt-1 text-xs text-neutral-600">
          Solicite um link de uso único por e-mail. A redefinição não exige que o
          usuário esteja autenticado.
        </p>

        <form
          onSubmit={handleRecovery}
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="recovery-email"
              className="block text-xs font-bold uppercase"
            >
              E-mail cadastrado
            </label>
            <input
              id="recovery-email"
              type="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              className="mt-1 w-full border-2 border-black px-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-black hover:bg-neutral-100"
          >
            Enviar link de redefinição
          </button>
        </form>

        {recoveryFeedback && (
          <p
            role="status"
            className="mt-3 border border-black bg-emerald-100 p-2 text-xs font-bold text-black"
          >
            {recoveryFeedback}
          </p>
        )}
      </section>
    </div>
  );
}

export default LoginPage;
