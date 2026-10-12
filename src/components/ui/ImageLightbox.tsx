import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  /** URL a mostrar; null = cerrado. */
  src: string | null;
  /** Texto alternativo y pie de la imagen. */
  alt: string;
  onClose: () => void;
}

// Visor de imagen en primer plano. Usa <dialog> nativo como Modal: capa
// superior (también por encima de otro modal abierto), foco atrapado,
// Escape o clic fuera de la imagen para cerrar, y el foco vuelve a la
// miniatura que lo abrió.
export default function ImageLightbox({ src, alt, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = src !== null;
  // Conserva la última imagen durante la transición de salida.
  const [shown, setShown] = useState(src);
  if (src !== null && src !== shown) setShown(src);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={alt ? `Imagen ampliada: ${alt}` : "Imagen ampliada"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="lightbox m-auto p-0 bg-transparent max-w-none max-h-none overflow-visible open:flex flex-col items-center gap-3"
    >
      {shown && (
        <>
          <img
            src={shown}
            alt={alt}
            className="block max-w-[min(92vw,1200px)] max-h-[82dvh] object-contain rounded-lg bg-surface-2 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.5)]"
          />
          {alt && (
            <p className="text-sm text-white/90 text-center max-w-[92vw] truncate">
              {alt}
            </p>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar imagen"
        className="fixed top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </dialog>
  );
}
