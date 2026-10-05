import { useState } from "react";
import { PAGE_SIZE } from "@/api/pagination";

/**
 * Paginación en memoria para listas que ya llegaron completas. Devuelve la
 * misma forma que useCursorPagination, así sirve el mismo <CursorPagination>.
 * `resetKey` agrupa los filtros: si cambian, se vuelve a la primera página.
 */
export function useClientPagination<T>(
  all: readonly T[],
  resetKey: string,
  pageSize = PAGE_SIZE,
) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  // Filtros nuevos → primera página (ajuste durante el render, sin efecto).
  if (state.key !== resetKey) setState({ key: resetKey, page: 1 });

  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  // Si la lista se achicó (p. ej. tras refrescar), no quedar en una página vacía.
  const page = Math.min(state.key === resetKey ? state.page : 1, pages);
  const items = all.slice((page - 1) * pageSize, page * pageSize);

  return {
    items,
    total: all.length,
    page,
    hasPrev: page > 1,
    hasNext: page < pages,
    isFetching: false,
    prev: () => setState((s) => ({ ...s, page: Math.max(1, page - 1) })),
    next: () => setState((s) => ({ ...s, page: Math.min(pages, page + 1) })),
  };
}
