import type { AuthUser } from "@/api/auth";

/**
 * Permisos del rol (módulos de `authorizePermission` en el backend) que dan
 * acceso a cada pantalla del menú: basta con tener uno de la lista.
 */
const ROUTE_PERMISSIONS: Record<string, readonly string[]> = {
  "/dashboard": ["dashboard", "roles"],
  "/roles": ["roles"],
  "/users": ["users"],
  "/services": [
    "services",
    "detail-tourism",
    "detail-training",
    "detail-daycare",
  ],
  "/distribution": [
    "schedule-acompan",
    "schedule-tourism",
    "schedule-training",
    "schedule-daycare",
  ],
  "/acompanamiento": ["acompanamiento"],
  "/vehicles": ["vehicles"],
  "/faqs": ["frequently-questions"],
  "/categories": ["categories"],
  "/products": ["products"],
  "/discount-coupons": ["coupons"],
  "/sales": ["sales", "sales-detail"],
  "/settings": ["settings"],
};

/** ¿El rol tiene este permiso de módulo? */
export function hasPermission(user: AuthUser | null, key: string): boolean {
  return user?.permissions?.[key] === true;
}

/** Orden en que se busca la primera pantalla a la que entrar. */
const ROUTE_ORDER = Object.keys(ROUTE_PERMISSIONS);

/** ¿El rol del usuario permite entrar a esta pantalla del menú? */
export function canAccess(user: AuthUser | null, to: string): boolean {
  const needed = ROUTE_PERMISSIONS[to];
  // Rutas que no están en el mapa no se restringen desde el menú.
  if (!needed) return true;
  const granted = user?.permissions ?? {};
  return needed.some((p) => granted[p] === true);
}

/** Primera pantalla permitida (o null si el rol no tiene ninguna). */
export function firstAllowedRoute(user: AuthUser | null): string | null {
  return ROUTE_ORDER.find((to) => canAccess(user, to)) ?? null;
}
