import { useState } from "react";
import ZoomableImage from "@/components/ui/ZoomableImage";
import { initialsOf } from "./userForm";

// Tonos oscuros: las iniciales en blanco mantienen contraste AA en todos.
const COLORS = [
  "#1D4ED8",
  "#15803D",
  "#B45309",
  "#B91C1C",
  "#6D28D9",
  "#0E7490",
  "#C2410C",
  "#BE185D",
];

interface Props {
  name: string;
  lastname: string | null;
  /** Posición en la lista: elige el color de fondo de las iniciales. */
  idx: number;
  image?: string | null;
}

/** Foto del usuario (ampliable) o sus iniciales sobre un color. */
export default function UserAvatar({ name, lastname, idx, image }: Props) {
  const [imgError, setImgError] = useState(false);
  if (image && !imgError) {
    return (
      <ZoomableImage
        src={image}
        alt={`${name} ${lastname ?? ""}`.trim()}
        buttonClassName="rounded-full"
        className="w-8 h-8 rounded-full object-cover shrink-0 bg-line"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
      aria-hidden="true"
    >
      {initialsOf(name, lastname)}
    </div>
  );
}
