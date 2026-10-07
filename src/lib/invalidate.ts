import type { QueryClient } from "@tanstack/react-query";

// Qué vistas se refrescan después de cada transacción. Cada recurso lista su
// propia clave y las de los módulos que muestran sus datos (nombres, conteos,
// stock…), para que ninguna pantalla quede desactualizada sin recargar.
// Las claves son prefijos: invalidan tanto el listado completo (["users"])
// como sus páginas filtradas (["users", {...}, "page", cursor]).
const RELATED = {
  categories: ["categories", "products"], // productos muestran el nombre de la categoría
  products: ["products", "sales"], // los pedidos muestran nombre/foto del producto
  sales: ["sales", "products", "coupons"], // cancelar repone stock y el uso del cupón
  coupons: ["coupons"],
  roles: ["roles", "users"], // usuarios muestran el nombre del rol
  users: ["users", "roles"], // roles muestran cuántos usuarios tienen
  vehicles: [
    "vehicles",
    "schedules-acompan",
    "schedules-tourism",
    "schedules-daycare",
  ], // las citas muestran el vehículo asignado
  services: [
    "services",
    "schedules-acompan",
    "detail-tourism",
    "detail-training",
    "detail-daycare",
  ],
  "detail-tourism": ["detail-tourism", "schedules-tourism"],
  "detail-training": ["detail-training", "schedules-training"],
  "detail-daycare": ["detail-daycare", "schedules-daycare"],
  "schedules-acompan": ["schedules-acompan"],
  // Las excursiones muestran cuántas reservas esperan confirmación.
  "schedules-tourism": ["schedules-tourism", "detail-tourism"],
  // Los talleres muestran cuántas inscripciones esperan confirmación.
  "schedules-training": ["schedules-training", "detail-training"],
  schedules: [
    "schedules-acompan",
    "schedules-tourism",
    "schedules-training",
    "schedules-daycare",
  ],
  "frequently-questions": ["frequently-questions"],
  settings: ["settings", "sales"], // el número de WhatsApp arma el enlace de cada pedido
} as const satisfies Record<string, readonly string[]>;

export type Resource = keyof typeof RELATED;

/** Refresca el recurso y todas las vistas que dependen de él. */
export function invalidateResource(qc: QueryClient, resource: Resource) {
  return Promise.all(
    RELATED[resource].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );
}

/**
 * Listados que también cambian por transacciones hechas desde la app móvil
 * (reservas, compras, cancelaciones): se vuelven a pedir cada minuto mientras
 * la pantalla está abierta, además de al volver a la pestaña.
 */
export const LIVE_REFETCH_MS = 60_000;
