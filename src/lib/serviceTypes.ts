// Un solo mapa de estilos por tipo de servicio para todo el panel
// (tablas, calendario de distribución, dashboard). Clases → tokens de index.css.
export interface ServiceTypeStyle {
  label: string;
  /** Píldora: fondo claro + texto AA */
  badge: string;
  /** Superficie tenue para bloques de calendario */
  tint: string;
  /** Marcador sólido (puntos, leyendas, barras) */
  dot: string;
}

export const SERVICE_TYPE_STYLE: Record<string, ServiceTypeStyle> = {
  ACOMPAÑAMIENTO: {
    label: "Acompañamiento",
    badge: "bg-svc-acompanamiento-bg text-svc-acompanamiento-fg",
    tint: "bg-svc-acompanamiento-bg/60 text-svc-acompanamiento-fg",
    dot: "bg-svc-acompanamiento",
  },
  TURISMO: {
    label: "Turismo",
    badge: "bg-svc-turismo-bg text-svc-turismo-fg",
    tint: "bg-svc-turismo-bg/60 text-svc-turismo-fg",
    dot: "bg-svc-turismo",
  },
  CAPACITACION: {
    label: "Capacitación",
    badge: "bg-svc-capacitacion-bg text-svc-capacitacion-fg",
    tint: "bg-svc-capacitacion-bg/60 text-svc-capacitacion-fg",
    dot: "bg-svc-capacitacion",
  },
  GUARDERIA: {
    label: "Guardería",
    badge: "bg-svc-guarderia-bg text-svc-guarderia-fg",
    tint: "bg-svc-guarderia-bg/60 text-svc-guarderia-fg",
    dot: "bg-svc-guarderia",
  },
};

export const DEFAULT_SERVICE_TYPE_STYLE: ServiceTypeStyle = {
  label: "Servicio",
  badge: "bg-surface-2 text-ink-2",
  tint: "bg-surface-2 text-ink-2",
  dot: "bg-line-strong",
};

export function serviceTypeStyle(
  type: string | null | undefined,
): ServiceTypeStyle {
  return (type && SERVICE_TYPE_STYLE[type]) || DEFAULT_SERVICE_TYPE_STYLE;
}
