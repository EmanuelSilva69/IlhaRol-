import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  /** Precisa ser estável (useCallback) para o timer não reiniciar a cada render. */
  onClose: () => void;
  duration?: number;
}

/**
 * Aviso flutuante de confirmação: entra deslizando do rodapé, permanece
 * alguns segundos e sai com fade. Anunciado por leitores de tela.
 */
export function Toast({ message, onClose, duration = 3200 }: ToastProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setLeaving(false);

    const startLeaving = window.setTimeout(() => setLeaving(true), duration);
    const remove = window.setTimeout(onClose, duration + 220);

    return () => {
      window.clearTimeout(startLeaving);
      window.clearTimeout(remove);
    };
  }, [message, duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 max-w-sm border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.25)] ${
        leaving ? "toast-leave" : "toast-enter"
      }`}
    >
      {message}
    </div>
  );
}

export default Toast;
