import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CursorPage } from "@/api/pagination";

/**
 * Navegación Anterior/Siguiente sobre un listado paginado por cursor.
 * Guarda la pila de cursores visitados: "Siguiente" apila el next_cursor
 * de la página actual y "Anterior" lo desapila.
 *
 * `queryKey` debe empezar por la clave del recurso (p. ej. "users") para
 * que los invalidateQueries de las mutaciones también refresquen la página,
 * e incluir los filtros: si cambian, se vuelve a la primera página.
 */
export function useCursorPagination<T, C = undefined>(
  queryKey: readonly unknown[],
  fetchPage: (cursor: string | null) => Promise<CursorPage<T, C>>,
) {
  const key = JSON.stringify(queryKey);
  const [state, setState] = useState<{ key: string; cursors: (string | null)[] }>(
    { key, cursors: [null] },
  );
  // Filtros nuevos → primera página (ajuste durante el render, sin un
  // render intermedio con el cursor de los filtros anteriores).
  if (state.key !== key) setState({ key, cursors: [null] });
  const cursors = state.key === key ? state.cursors : [null];
  const cursor = cursors[cursors.length - 1];

  const query = useQuery({
    queryKey: [...queryKey, "page", cursor],
    queryFn: () => fetchPage(cursor),
    // Mantiene la página anterior en pantalla mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  // Si la página quedó vacía (se eliminó su último registro), volver atrás.
  if (
    state.key === key &&
    !query.isPlaceholderData &&
    data?.items.length === 0 &&
    cursors.length > 1
  ) {
    setState({ key, cursors: cursors.slice(0, -1) });
  }

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    counts: data?.counts,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    /** Número de página (1 = primera). */
    page: cursors.length,
    hasPrev: cursors.length > 1,
    hasNext: Boolean(data?.next_cursor) && !query.isPlaceholderData,
    next: () => {
      const nextCursor = data?.next_cursor;
      if (nextCursor)
        setState((s) => ({ ...s, cursors: [...s.cursors, nextCursor] }));
    },
    prev: () =>
      setState((s) =>
        s.cursors.length > 1 ? { ...s, cursors: s.cursors.slice(0, -1) } : s,
      ),
  };
}
