import { useState, useSyncExternalStore } from "react";

export type ViewMode = "list" | "grid";

// Bajo xl (1280px) el área de contenido, con el menú lateral, no llega a
// ~960px y las tablas quedarían apretadas o con desplazamiento lateral, así
// que la vista por defecto es la cuadrícula de tarjetas.
// Las tablas más anchas (7+ columnas con texto) usan el corte 2xl (1536px).
const NARROW_QUERY = {
  xl: "(max-width: 1279.98px)",
  "2xl": "(max-width: 1535.98px)",
} as const;

export type TableBreakpoint = keyof typeof NARROW_QUERY;

const subscribers = (query: string) => (onChange: () => void) => {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};
const SUBSCRIBE = {
  xl: subscribers(NARROW_QUERY.xl),
  "2xl": subscribers(NARROW_QUERY["2xl"]),
};
const IS_NARROW = {
  xl: () => window.matchMedia(NARROW_QUERY.xl).matches,
  "2xl": () => window.matchMedia(NARROW_QUERY["2xl"]).matches,
};

/**
 * Vista de un listado: por defecto lista (tabla) en pantallas anchas y
 * cuadrícula en angostas, siguiendo los cambios de tamaño de la ventana.
 * Si el usuario elige una vista con el selector, se respeta mientras siga
 * en el módulo.
 */
export function useViewMode(tableFrom: TableBreakpoint = "xl") {
  const narrow = useSyncExternalStore(
    SUBSCRIBE[tableFrom],
    IS_NARROW[tableFrom],
    () => false,
  );
  const [chosen, setChosen] = useState<ViewMode | null>(null);
  const view: ViewMode = chosen ?? (narrow ? "grid" : "list");
  return [view, setChosen] as const;
}
