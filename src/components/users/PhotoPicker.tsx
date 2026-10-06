import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import ZoomableImage from "@/components/ui/ZoomableImage";
import { MAX_PHOTO_MB } from "./userForm";

interface Props {
  file: File | null;
  currentUrl: string | null;
  initials: string;
  error: string | null;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}

/** Foto de perfil del formulario: vista previa, subir/cambiar y descartar. */
export default function PhotoPicker({
  file,
  currentUrl,
  initials,
  error,
  disabled,
  onPick,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // La URL temporal del archivo se libera al cambiarlo o al cerrar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-line flex items-center justify-center shrink-0 ring-1 ring-line">
        {shown ? (
          <ZoomableImage
            src={shown}
            alt="Foto de perfil"
            buttonClassName="w-full h-full rounded-full"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-ink-3" aria-hidden="true">
            {initials || "?"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink mb-1">Foto de perfil</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={12} /> {shown ? "Cambiar foto" : "Subir foto"}
          </Button>
          {file && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={onClear}
            >
              <X size={12} /> Descartar
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          tabIndex={-1}
          aria-label="Seleccionar foto de perfil"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            // Permite volver a elegir el mismo archivo tras descartarlo.
            e.target.value = "";
          }}
        />
        {error ? (
          <p className="text-danger-fg text-xs mt-1" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-ink-3 mt-1">
            Opcional · JPG o PNG, máx. {MAX_PHOTO_MB} MB
          </p>
        )}
      </div>
    </div>
  );
}
