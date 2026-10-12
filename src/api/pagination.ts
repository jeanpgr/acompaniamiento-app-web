// Paginación por cursor (created_at DESC) de los listados del panel.
// El backend solo pagina si recibe `limit`; sin él devuelve el arreglo
// completo (lo siguen usando los selects, el dashboard y la app móvil).

export const PAGE_SIZE = 10;

export interface CursorPage<T, C = undefined> {
  items: T[];
  /** Cursor opaco de la página siguiente; null en la última. */
  next_cursor: string | null;
  has_more: boolean;
  /** Registros que cumplen los filtros (todas las páginas). */
  total: number;
  /** Conteos para tarjetas/pestañas; ignoran el filtro de estado. */
  counts?: C;
}

export interface ActiveCounts {
  active: number;
  inactive: number;
}

export type PageFilters = Record<string, string | boolean | undefined>;

/** Query params de una página: limit, cursor y los filtros con valor. */
export const pageParams = (
  cursor: string | null,
  filters: PageFilters = {},
) => ({
  limit: PAGE_SIZE,
  ...(cursor ? { cursor } : {}),
  ...Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  ),
});
