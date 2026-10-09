import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  /** Sin `to` es la página actual (último tramo, no navegable). */
  to?: string;
}

/**
 * Ruta de navegación para las páginas anidadas (detalles de un servicio y
 * sus vistas hijas). Cada tramo anterior es un enlace; el último es la
 * página actual. Los nombres largos se recortan con "…" y el texto completo
 * queda en el `title`.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-ink-3">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li
              key={`${i}-${c.label}`}
              className="flex items-center gap-1 min-w-0"
            >
              {c.to && !last ? (
                <Link
                  to={c.to}
                  title={c.label}
                  className="truncate max-w-48 rounded-sm hover:text-ink-2 hover:underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  title={c.label}
                  aria-current={last ? "page" : undefined}
                  className={`truncate max-w-64 ${last ? "text-ink-2 font-medium" : ""}`}
                >
                  {c.label}
                </span>
              )}
              {!last && (
                <ChevronRight
                  size={12}
                  className="shrink-0"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
