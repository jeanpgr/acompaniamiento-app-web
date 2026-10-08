import type { ScheduleKind } from "@/api/dashboard";

// Formatos compartidos por las piezas del dashboard.

const moneyFmt = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const moneyFmtCents = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFmt = new Intl.NumberFormat("es-EC");

/** $1.250 (sin centavos si es entero), $12,50 con centavos. */
export const formatMoney = (v: number) =>
  Number.isInteger(v) ? moneyFmt.format(v) : moneyFmtCents.format(v);

export const formatInt = (v: number) => intFmt.format(v);

/** Fecha "YYYY-MM-DD" (día de Ecuador) como fecha local, sin corrimiento UTC. */
export const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Etiqueta corta del eje: "6 oct". */
export const shortDay = (key: string) =>
  parseDay(key).toLocaleDateString("es-EC", { day: "numeric", month: "short" });

/** Etiqueta del tooltip: "lunes, 6 de octubre" o "Semana del 6 oct". */
export const longBucket = (key: string, bucket: "day" | "week") =>
  bucket === "week"
    ? `Semana del ${shortDay(key)}`
    : parseDay(key).toLocaleDateString("es-EC", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

/** Orden fijo de los servicios: el color sigue al servicio, nunca a su rango. */
export const KIND_ORDER: ScheduleKind[] = [
  "acompan",
  "tourism",
  "training",
  "daycare",
];

export const KIND_META: Record<
  ScheduleKind,
  { label: string; color: string; type: string }
> = {
  acompan: {
    label: "Acompañamiento",
    color: "var(--color-svc-acompanamiento)",
    type: "ACOMPAÑAMIENTO",
  },
  tourism: {
    label: "Turismo",
    color: "var(--color-svc-turismo)",
    type: "TURISMO",
  },
  training: {
    label: "Capacitación",
    color: "var(--color-svc-capacitacion)",
    type: "CAPACITACION",
  },
  daycare: {
    label: "Guardería",
    color: "var(--color-svc-guarderia)",
    type: "GUARDERIA",
  },
};
