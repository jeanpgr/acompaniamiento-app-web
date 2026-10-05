import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { PAGE_SIZE } from "@/api/pagination";
import type { useCursorPagination } from "@/hooks/useCursorPagination";

type Pager = Pick<
  ReturnType<typeof useCursorPagination<unknown, unknown>>,
  | "items"
  | "total"
  | "page"
  | "hasPrev"
  | "hasNext"
  | "prev"
  | "next"
  | "isFetching"
>;

// Pie de tabla para los listados paginados por cursor: rango visible,
// total y navegación Anterior/Siguiente.
export default function CursorPagination({
  pager,
  pageSize = PAGE_SIZE,
}: {
  pager: Pager;
  /** Tamaño de página, si no es el del servidor (p. ej. paginación en memoria). */
  pageSize?: number;
}) {
  const { items, total, page, hasPrev, hasNext, prev, next, isFetching } =
    pager;
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = from + items.length - 1;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-line"
    >
      <p className="text-xs text-ink-3 tabular-nums" aria-live="polite">
        {items.length > 0 ? `${from}–${to} de ${total}` : `${total} en total`}
      </p>
      {(hasPrev || hasNext) && (
        <div
          className="flex items-center gap-2"
          aria-busy={isFetching || undefined}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={prev}
            disabled={!hasPrev || isFetching}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Anterior
          </Button>
          <span className="text-xs text-ink-3 tabular-nums px-1">
            Página {page}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={next}
            disabled={!hasNext || isFetching}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}
