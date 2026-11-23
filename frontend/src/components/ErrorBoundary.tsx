import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

/**
 * Evita a tela branca quando uma exceção de runtime escapa da árvore React.
 * O usuário recebe uma saída clara e um botão para recarregar o protótipo.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("IlhaRolê: erro de runtime na interface", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-white p-6 text-black">
          <section className="w-full max-w-xl border-2 border-black bg-amber-50 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-red-900">
              Erro inesperado na interface
            </p>
            <h1 className="mt-2 text-2xl font-black uppercase">
              O IlhaRolê não conseguiu renderizar esta tela
            </h1>
            <p className="mt-2 text-xs text-neutral-700">
              A API pode estar indisponível ou ocorreu uma falha de runtime.
              Recarregue a página para tentar novamente.
            </p>
            {this.state.message && (
              <pre className="mt-3 overflow-auto border border-black bg-white p-2 text-[11px]">
                {this.state.message}
              </pre>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cursor-pointer border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
              >
                Recarregar site
              </button>
              <a
                href="#/feed"
                className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase"
              >
                Voltar ao feed
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
