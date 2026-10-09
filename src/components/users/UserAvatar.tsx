import { useState } from "react";
import ZoomableImage from "@/components/ui/ZoomableImage";
import { initialsOf } from "./userForm";

// Tonos de la paleta de la app móvil (verde salvia como el avatar del
// Inicio). Todos oscuros: las iniciales en blanco mantienen contraste AA.
const COLORS = [
  "#3A8049",
  "#1B5598",
  "#C8401C",
  "#0B233B",
  "#B45309",
  "#7C3AED",
  "#0F7A5C",
  "#1E40AF",
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
        className="w-10 h-10 rounded-full object-cover shrink-0 bg-line"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
      aria-hidden="true"
    >
      {initialsOf(name, lastname)}
    </div>
  );
}
