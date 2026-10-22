import { useEffect, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import ImageLightbox from "@/components/ui/ImageLightbox";

export const MAX_TOURISM_PHOTOS = 3;
const ACCEPT = "image/jpeg,image/jpg,image/png";
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  /** Fotos ya guardadas (URL firmada) y su posición original. */
  saved: { url: string; index: number }[];
  /** Archivos elegidos, aún sin subir. */
  added: File[];
  onAdd: (files: File[]) => void;
  onRemoveSaved: (index: number) => void;
  onRemoveAdded: (position: number) => void;
}

/** Vista previa de un archivo local; libera la URL temporal al cambiarlo. */
function useObjectUrls(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/**
 * Fotos del lugar de la excursión (hasta 3): las guardadas y las nuevas se
 * muestran juntas; se pueden ampliar y quitar antes de guardar.
 */
export default function PhotosZone({
  saved,
  added,
  onAdd,
  onRemoveSaved,
  onRemoveAdded,
}: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previews = useObjectUrls(added);
  const total = saved.length + added.length;
  const free = MAX_TOURISM_PHOTOS - total;

  const pick = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    const invalid = files.find(
      (f) => !ACCEPT.split(",").includes(f.type) || f.size > MAX_SIZE,
    );
    if (invalid) {
      setError("Solo JPG o PNG de hasta 5 MB por foto.");
      return;
    }
    if (files.length > free) {
      setError(`Puedes agregar ${free} ${free === 1 ? "foto más" : "fotos más"}.`);
      return;
    }
    setError(null);
    onAdd(files);
  };

  const thumb = (key: string, url: string, onRemove: () => void) => (
    <div
      key={key}
      className="relative w-24 h-24 rounded-xl overflow-hidden ring-1 ring-line bg-surface-2"
    >
      <button
        type="button"
        onClick={() => setZoom(url)}
        aria-label="Ver foto ampliada"
        className="w-full h-full"
      >
        <img src={url} alt="Foto del lugar" className="w-full h-full object-cover" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="Quitar foto"
        aria-label="Quitar foto"
        className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
      >
        <X size={14} className="text-white" />
      </button>
    </div>
  );

  return (
    <div>
      <p className="block text-sm font-semibold text-ink mb-1">
        Fotos del lugar{" "}
        <span className="font-normal text-ink-3">
          ({total}/{MAX_TOURISM_PHOTOS})
        </span>
      </p>
      <p className="text-xs text-ink-3 mb-2">
        Se muestran en la app donde el usuario reserva. JPG o PNG · máx. 5 MB.
      </p>
      <div className="flex flex-wrap gap-2">
        {saved.map((p) =>
          thumb(`s${p.index}`, p.url, () => onRemoveSaved(p.index)),
        )}
        {added.map((f, i) =>
          thumb(`a${i}-${f.name}`, previews[i], () => onRemoveAdded(i)),
        )}
        {free > 0 && (
          <label className="w-24 h-24 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-line-strong rounded-xl cursor-pointer text-primary bg-surface-2 hover:border-primary hover:bg-primary-soft focus-within:border-focus transition-colors">
            <ImagePlus size={22} />
            <span className="text-xs font-semibold">Agregar</span>
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="text-danger-fg text-xs font-semibold mt-1.5">{error}</p>
      )}
      <ImageLightbox
        src={zoom}
        alt="Foto del lugar"
        onClose={() => setZoom(null)}
      />
    </div>
  );
}
