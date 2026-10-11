/**
 * Permisos de un rol, agrupados por el módulo del menú al que pertenecen.
 * Las claves deben coincidir con `authorizePermission("<módulo>")` del
 * backend; `acompanamiento` solo abre la pantalla Acompañamiento (un
 * conductor ve únicamente lo que tiene asignado).
 */
export interface PermissionGroup {
  /** Módulo de la interfaz (como se llama en el menú). */
  module: string;
  items: { key: string; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: "Dashboard",
    items: [{
        key: "dashboard",
        label: "Ver métricas y pendientes (conductor: solo sus servicios)",
      }],
  },
  {
    module: "Usuarios y roles",
    items: [
      { key: "users", label: "Gestionar usuarios" },
      { key: "roles", label: "Gestionar roles y permisos" },
    ],
  },
  {
    module: "Gestión servicios",
    items: [
      { key: "services", label: "Servicios" },
      { key: "detail-tourism", label: "Excursiones de turismo" },
      { key: "detail-training", label: "Capacitaciones" },
      { key: "detail-daycare", label: "Planes de guardería" },
    ],
  },
  {
    module: "Distribución y reservas",
    items: [
      { key: "schedule-acompan", label: "Citas de acompañamiento (todas)" },
      { key: "schedule-tourism", label: "Reservas de turismo" },
      { key: "schedule-training", label: "Inscripciones de capacitación" },
      { key: "schedule-daycare", label: "Solicitudes de guardería" },
    ],
  },
  {
    module: "Acompañamiento",
    items: [
      {
        key: "acompanamiento",
        label: "Ver y marcar mis servicios asignados (conductor)",
      },
    ],
  },
  {
    module: "Vehículos",
    items: [{ key: "vehicles", label: "Gestionar vehículos" }],
  },
  {
    module: "FAQ",
    items: [{ key: "frequently-questions", label: "Preguntas frecuentes" }],
  },
  {
    module: "Comercio",
    items: [
      { key: "categories", label: "Categorías" },
      { key: "products", label: "Productos" },
      { key: "coupons", label: "Cupones de descuento" },
      { key: "sales", label: "Ventas" },
      { key: "sales-detail", label: "Detalle de ventas" },
    ],
  },
  {
    module: "Configuración",
    items: [{ key: "settings", label: "Configuración del sistema" }],
  },
  {
    module: "Otros",
    items: [{ key: "customer-reviews", label: "Reseñas de clientes (API)" }],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);
