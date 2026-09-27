import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

// <dialog> nativo: capa superior (escapa cualquier overflow), foco atrapado,
// Escape para cerrar y el foco vuelve al disparador al cerrar. El elemento
// queda montado para que close() pueda devolver el foco; el contenido solo
// se monta mientras está abierto.
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape: el padre decide (p. ej. no cerrar mientras se guarda).
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`m-auto p-0 bg-surface rounded-xl shadow-[0_24px_48px_-12px_rgb(11_35_59/0.35)] w-[calc(100%-2rem)] ${size === "lg" ? "max-w-2xl" : "max-w-md"} max-h-[calc(100dvh-2rem)] text-ink open:flex flex-col`}
    >
      {open && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
            <h3 id={titleId} className="font-semibold text-ink truncate pr-4">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 w-9 h-9 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 border-t border-line flex justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
