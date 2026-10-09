import type { ReactNode } from "react";

// Piezas de la vista de cuadrícula de los listados: contenedor, tarjeta,
// filas etiqueta/valor y pie de acciones. Mismo aspecto en todos los módulos.

export function CardGrid({
  children,
  empty,
}: {
  children: ReactNode;
  /** Mensaje cuando no hay tarjetas (null/undefined si hay contenido). */
  empty?: ReactNode;
}) {
  if (empty) {
    return <p className="px-5 py-10 text-center text-ink-3 text-[15px]">{empty}</p>;
  }
  // Las columnas dependen del ancho del contenedor (no de la pantalla): la
  // misma cuadrícula sirve a pantalla completa o junto a un panel lateral.
  return (
    <div className="@container">
      <ul
        role="list"
        className="grid grid-cols-1 gap-3 p-3 @sm:p-4 @xl:grid-cols-2 @4xl:grid-cols-3"
      >
        {children}
      </ul>
    </div>
  );
}

export function GridCard({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  /** Resalta la tarjeta (p. ej. el elemento abierto en un panel lateral). */
  selected?: boolean;
  /** La tarjeta entera es seleccionable (los botones internos siguen funcionando). */
  onClick?: () => void;
}) {
  return (
    <li
      onClick={onClick}
      className={`flex flex-col gap-3 min-w-0 rounded-xl bg-surface p-4 shadow-card transition-[box-shadow,background-color] ${
        selected
          ? "ring-2 ring-primary bg-primary-soft/40"
          : "hover:shadow-md"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {children}
    </li>
  );
}

/** Lista de pares etiqueta/valor dentro de una tarjeta. */
export function CardFields({ children }: { children: ReactNode }) {
  return <dl className="space-y-1.5 text-sm">{children}</dl>;
}

export function CardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-3 font-medium shrink-0">{label}</dt>
      <dd className="text-ink text-right min-w-0 wrap-break-word">
        {children}
      </dd>
    </div>
  );
}

/** Pie con las acciones, alineado al fondo de la tarjeta. */
export function CardActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-3 border-t border-line">
      {children}
    </div>
  );
}
