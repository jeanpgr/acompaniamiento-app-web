import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Maximize2, X } from "lucide-react";
import ImageLightbox from "@/components/ui/ImageLightbox";

interface Props {
  /** Archivo elegido (aún sin subir). */
  file: File | null;
  /** Foto actual del producto, al editar. */
  currentUrl: string | null;
  required: boolean;
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}

const ACCEPT = "image/jpeg,image/jpg,image/png";

/** Zona de imagen del producto: subir, cambiar, ampliar y descartar. */
export default function ImageZone({
  file,
  currentUrl,
  required,
  error,
  onPick,
  onClear,
}: Props) {
  const [zoomed, setZoomed] = useState(false);
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  // La URL temporal del archivo se libera al cambiarlo o al cerrar.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? currentUrl;

  const fileInput = (
    <input
      type="file"
      accept={ACCEPT}
      className="sr-only"
      onChange={(e) => {
        const picked = e.target.files?.[0];
        if (picked) onPick(picked);
        // Permite volver a elegir el mismo archivo tras descartarlo.
        e.target.value = "";
      }}
    />
  );

  return (
    <div>
      <p className="block text-sm font-medium text-ink mb-1.5">
        Imagen del producto
        {required && <span className="text-danger-fg"> *</span>}
      </p>

      {displayUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-line bg-surface-2 h-44">
          <img
            src={displayUrl}
            alt="Vista previa del producto"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
            }}
          />
          <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-sidebar/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus-within:outline-2 focus-within:outline-focus transition-opacity cursor-pointer">
            <ImagePlus size={22} className="text-white" />
            <span className="text-white text-xs font-medium">Cambiar imagen</span>
            <span className="text-white/80 text-[11px]">
              JPEG o PNG · máx. 5 MB
            </span>
            {fileInput}
          </label>
          {/* Toda la zona cambia la imagen; este botón la abre en primer plano */}
          <button
            type="button"
            onClick={() => setZoomed(true)}
            title="Ver imagen ampliada"
            aria-label="Ver imagen ampliada"
            className="absolute top-2 left-2 z-10 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
          >
            <Maximize2 size={13} className="text-white" aria-hidden="true" />
          </button>
          <ImageLightbox
            src={zoomed ? displayUrl : null}
            alt="Imagen del producto"
            onClose={() => setZoomed(false)}
          />
          {previewUrl && (
            <button
              type="button"
              onClick={onClear}
              title="Quitar imagen seleccionada"
              aria-label="Quitar imagen seleccionada"
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors focus-within:border-focus ${
            error
              ? "border-danger bg-danger-bg hover:border-danger"
              : "border-line bg-surface-2 hover:border-info hover:bg-info-bg/40"
          }`}
        >
          <ImagePlus size={28} className={error ? "text-danger-fg" : "text-ink-3"} />
          <p className="mt-2 text-sm font-medium text-ink-3">
            Haz clic para subir imagen
          </p>
          <p className="text-xs text-ink-3 mt-0.5">JPEG o PNG · máx. 5 MB</p>
          {fileInput}
        </label>
      )}

      {error && (
        <p className="text-danger-fg text-xs mt-1.5 flex items-center gap-1">
          {error}
        </p>
      )}
      {file && (
        <p className="text-ink-3 text-xs mt-1.5 truncate">
          {file.name} · {(file.size / 1024).toFixed(0)} KB
        </p>
      )}
    </div>
  );
}
