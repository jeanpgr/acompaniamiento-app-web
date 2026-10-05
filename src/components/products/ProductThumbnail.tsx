import { useState } from "react";
import { Package } from "lucide-react";
import ZoomableImage from "@/components/ui/ZoomableImage";

interface Props {
  photo: string;
  name: string;
  /** Tamaño del recuadro (miniatura de la tabla o portada de la tarjeta). */
  className?: string;
  iconSize?: number;
}

/** Foto del producto (ampliable) o un ícono si no hay o no carga. */
export default function ProductThumbnail({
  photo,
  name,
  className = "w-12 h-12",
  iconSize = 16,
}: Props) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className={`${className} rounded-lg overflow-hidden shrink-0 border border-line bg-surface-2 flex items-center justify-center`}
    >
      {photo && !imgError ? (
        <ZoomableImage
          src={photo}
          alt={name}
          buttonClassName="w-full h-full"
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : (
        <Package size={iconSize} className="text-ink-3" />
      )}
    </div>
  );
}
