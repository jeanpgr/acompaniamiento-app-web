import { useState, useSyncExternalStore } from "react";

export type ViewMode = "list" | "grid";

// Mismo corte que la barra lateral (lg = 1024px): por debajo la navegación
// pasa a cajón y las tablas (min. 640–720px) quedan apretadas, así que la
// vista por defecto es la cuadrícula de tarjetas.
const NARROW_QUERY = "(max-width: 1023.98px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(NARROW_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const isNarrow = () => window.matchMedia(NARROW_QUERY).matches;

/**
 * Vista de un listado: por defecto lista (tabla) en pantallas anchas y
 * cuadrícula en angostas, siguiendo los cambios de tamaño de la ventana.
 * Si el usuario elige una vista con el selector, se respeta mientras siga
 * en el módulo.
 */
export function useViewMode() {
  const narrow = useSyncExternalStore(subscribe, isNarrow, () => false);
  const [chosen, setChosen] = useState<ViewMode | null>(null);
  const view: ViewMode = chosen ?? (narrow ? "grid" : "list");
  return [view, setChosen] as const;
}
