interface NavbarProps {
  currentHash: string;
  favoritesCount: number;
  unreadAlertsCount: number;
  isAuthenticated: boolean;
  userName: string;
  onToggleAuth: () => void;
}

const NAV_LINKS = [
  { href: "#/feed", label: "1. Explorar Feed & Mapa", match: "#/feed" },
  {
    href: "#/evento/musica-1",
    label: "2. Detalhes do Evento",
    match: "#/evento/",
  },
  { href: "#/login", label: "3. Login / Cadastro", match: "#/login" },
  { href: "#/minha-agenda", label: "4. Minha Agenda", match: "#/minha-agenda" },
  {
    href: "#/organizador",
    label: "5. Área do Organizador",
    match: "#/organizador",
  },
  { href: "#/perfil", label: "6. Perfil & Alertas", match: "#/perfil" },
];

export function Navbar({
  currentHash,
  favoritesCount,
  unreadAlertsCount,
  isAuthenticated,
  userName,
  onToggleAuth,
}: NavbarProps) {
  const normalizedHash = currentHash || "#/feed";

  return (
    <header className="border-b-2 border-black bg-white">
      <div className="border-b border-black bg-neutral-900 px-4 py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-white">
        IlhaRolê · Protótipo Navegável (Primeira Entrega & Sprint 1) · São Luís - MA
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a
              href="#/feed"
              className="inline-block text-2xl font-black uppercase tracking-tight text-black hover:underline focus:outline-2 focus:outline-offset-2 focus:outline-black"
            >
              IlhaRolê <span className="text-sm font-bold text-neutral-600">SLZ</span>
            </a>
            <p className="text-xs font-medium text-neutral-600">
              Agenda cultural colaborativa e eventos em São Luís do Maranhão
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-black bg-neutral-100 px-2.5 py-1 text-xs font-bold">
              Sessão:{" "}
              <strong>{isAuthenticated ? `${userName} (JWT Ativo)` : "Visitante"}</strong>
            </span>
            <button
              type="button"
              onClick={onToggleAuth}
              className="cursor-pointer border border-black bg-black px-3 py-1 text-xs font-bold uppercase text-white hover:bg-neutral-800 focus:outline-2 focus:outline-offset-2 focus:outline-black"
            >
              {isAuthenticated ? "Simular Logout" : "Simular Login"}
            </button>
          </div>
        </div>

        <nav
          aria-label="Navegação principal entre as telas do protótipo"
          className="mt-4 flex flex-wrap gap-2"
        >
          {NAV_LINKS.map((item) => {
            const isActive =
              normalizedHash === item.match ||
              (item.match !== "#/feed" && normalizedHash.startsWith(item.match));

            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`border-2 border-black px-3 py-1.5 text-xs font-black uppercase transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-black ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                {item.label}
                {item.href === "#/minha-agenda" && (
                  <span className="ml-1.5 inline-block border border-current px-1.5 py-0.2 text-[10px]">
                    {favoritesCount} salvos / {unreadAlertsCount} alertas
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;