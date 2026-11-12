export function Footer() {
  return (
    <footer className="mt-12 border-t-2 border-black bg-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-neutral-800">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="font-black uppercase tracking-wider text-black">
              IlhaRolê — Hub e Agenda Cultural de São Luís (MA)
            </p>
            <p className="mt-1 text-neutral-600">
              Protótipo navegável mobile-first (360px, 768px, 1366px) · Mapa Leaflet + OpenStreetMap/CARTO
            </p>
          </div>

          <div className="flex flex-wrap gap-3 font-bold uppercase">
            <a href="#/feed" className="underline hover:text-black">
              Explorar Feed
            </a>
            <a href="#/minha-agenda" className="underline hover:text-black">
              Minha Agenda
            </a>
            <a href="#/organizador" className="underline hover:text-black">
              Publicar Evento
            </a>
            <a href="#/login" className="underline hover:text-black">
              Autenticação
            </a>
            <a href="#/perfil" className="underline hover:text-black">
              Perfil & Alertas
            </a>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-300 pt-3 text-[11px] text-neutral-600">
          <strong>Equipe IlhaRolê (UFMA — Desenvolvimento Web):</strong> Emanuel
          Lopes Silva, José Nunes de Sousa Neto, Josuel Pinheiro Barros Junior,
          Leonidas Ferreira da Silva Serra, Marcos Vinicius Jansem Oliveira e
          Thales Aymar Fortes de Souza.
        </div>
      </div>
    </footer>
  );
}

export default Footer;