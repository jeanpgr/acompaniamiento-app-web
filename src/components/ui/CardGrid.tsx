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
    return <p className="px-5 py-8 text-center text-ink-3 text-sm">{empty}</p>;
  }
  return (
    <ul role="list" className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </ul>
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
      className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 transition-colors ${
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-line hover:border-line-strong"
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
      <dt className="text-ink-3 shrink-0">{label}</dt>
      <dd className="text-ink text-right min-w-0 wrap-break-word">{children}</dd>
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
