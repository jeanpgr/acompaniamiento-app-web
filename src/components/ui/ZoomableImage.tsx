import { useState, type ImgHTMLAttributes } from "react";
import ImageLightbox from "@/components/ui/ImageLightbox";

interface Props
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  /** Describe la imagen; también es el pie en el visor. */
  alt: string;
  /** Clases del botón que envuelve la miniatura (forma, tamaño). */
  buttonClassName?: string;
}

// Miniatura que al pulsarla abre la imagen en primer plano (ImageLightbox).
export default function ZoomableImage({
  src,
  alt,
  buttonClassName = "",
  ...imgProps
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt ? `Ver imagen ampliada: ${alt}` : "Ver imagen ampliada"}
        title="Ver imagen ampliada"
        className={`inline-flex shrink-0 p-0 cursor-zoom-in transition-opacity hover:opacity-85 ${buttonClassName}`}
      >
        <img src={src} alt="" {...imgProps} />
      </button>
      <ImageLightbox
        src={open ? src : null}
        alt={alt}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
