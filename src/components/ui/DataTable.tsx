import type { ReactNode } from "react";

/** Columna: solo el título, o el título (puede llevar ícono) con clases extra. */
export type Column = string | { label: ReactNode; className?: string };

/** Encabezado de tabla con el estilo del panel. */
export function TableHead({ columns }: { columns: readonly Column[] }) {
  return (
    <thead>
      <tr className="border-b border-line bg-surface-2">
        {columns.map((col, i) => {
          const { label, className = "" } =
            typeof col === "string" ? { label: col } : col;
          return (
            <th
              // Las columnas son fijas: el índice es una key estable.
              key={i}
              scope="col"
              className={`text-left text-xs font-medium text-ink-3 px-5 py-3 ${className}`}
            >
              {label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

/** Fila de la tabla con hover. */
export function TableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line/70 hover:bg-surface-2">{children}</tr>
  );
}

/** Fila que ocupa toda la tabla cuando no hay resultados. */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-8 text-center text-ink-3 text-sm">
        {children}
      </td>
    </tr>
  );
}

/** Valor vacío en una celda ("—"). */
export function EmptyCell() {
  return <span className="text-ink-3 italic text-xs">—</span>;
}
