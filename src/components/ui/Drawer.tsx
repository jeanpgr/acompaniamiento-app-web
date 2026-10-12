import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texto bajo el título. */
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// Panel lateral que entra desde la derecha. Igual que Modal usa <dialog>
// nativo (capa superior, foco atrapado, Escape, foco de vuelta al
// disparador) y puede abrirse encima de un Modal. Ocupa todo el alto; en
// pantallas angostas, todo el ancho.
export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Mismo patrón que Modal: el contenido sigue montado durante la salida.
  const [wasOpen, setWasOpen] = useState(open);
  const [lingering, setLingering] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setLingering(!open);
  }

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
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTransitionEnd={(e) => {
        if (!open && e.target === e.currentTarget) setLingering(false);
      }}
      className="drawer bg-surface text-ink shadow-[-24px_0_48px_-12px_rgb(11_35_59/0.35)] open:flex flex-col"
    >
      {(open || lingering) && (
        <>
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-5 border-b border-line shrink-0">
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-bold text-ink">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-ink-3 mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-2 w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
          {footer && (
            <div className="px-5 sm:px-6 py-4 border-t border-line bg-surface-2/60 flex flex-col-reverse min-[400px]:flex-row min-[400px]:justify-end gap-2 min-[400px]:gap-3 shrink-0 *:w-full min-[400px]:*:w-auto">
              {footer}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
