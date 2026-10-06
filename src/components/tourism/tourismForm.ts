import { z } from "zod";
import type {
  CreateDetailTourismInput,
  DetailTourism,
} from "@/api/details-tourism";
import {
  fromLocalInput,
  isPastLocalInput,
  isValidLocalInput,
  toLocalInput,
} from "@/lib/datetime";

/** Largos máximos de las columnas (detail_srv_tourism). */
export const TOURISM_LIMITS = {
  name: 80,
  description: 250,
  address: 255,
  place: 80,
} as const;

const price = z
  .number({ message: "Ingresa un número" })
  .nonnegative("Debe ser 0 o mayor")
  .optional();

const baseSchema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(TOURISM_LIMITS.name, `Máximo ${TOURISM_LIMITS.name} caracteres`),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es requerida")
    .max(
      TOURISM_LIMITS.description,
      `Máximo ${TOURISM_LIMITS.description} caracteres`,
    ),
  date_output: z
    .string()
    .refine(isValidLocalInput, "Fecha de salida requerida"),
  date_arrival: z
    .string()
    .refine(isValidLocalInput, "Fecha de llegada requerida"),
  quotas: z
    .number({ message: "Ingresa un número" })
    .int("Debe ser un número entero")
    .positive("Debe ser al menos 1")
    .max(1000, "Máximo 1000 cupos"),
  meeting_point_address: z
    .string()
    .trim()
    .max(TOURISM_LIMITS.address, `Máximo ${TOURISM_LIMITS.address} caracteres`)
    .optional(),
  // Punto del mapa; se descarta si la dirección se edita a mano.
  meeting_point_lat: z.number().nullable(),
  meeting_point_lng: z.number().nullable(),
  price_adult: price,
  price_child: price,
  price_senior: price,
  // Paradas del recorrido (useFieldArray); las vacías se descartan al enviar.
  itinerary: z.array(
    z
      .object({
        hour: z.string(),
        place: z
          .string()
          .trim()
          .max(
            TOURISM_LIMITS.place,
            `Máximo ${TOURISM_LIMITS.place} caracteres`,
          ),
      })
      .refine((s) => !s.hour || !!s.place, {
        message: "Indica el lugar o actividad",
        path: ["place"],
      }),
  ),
});

/**
 * Esquema del formulario. Al crear, la salida debe ser futura: la app móvil
 * oculta los viajes que ya salieron, así que uno en el pasado nunca se vería.
 * Al editar se permite (p. ej. corregir un viaje que ya ocurrió), pero los
 * cupos no pueden bajar de los que ya están reservados.
 */
export function tourismSchema(editing: DetailTourism | null) {
  const reserved = editing
    ? Math.max(0, editing.quotas - editing.quotas_available)
    : 0;
  return baseSchema.superRefine((d, ctx) => {
    if (d.quotas < reserved) {
      ctx.addIssue({
        code: "custom",
        message: `Ya hay ${reserved} cupos reservados; no puede ser menor`,
        path: ["quotas"],
      });
    }
    if (!isValidLocalInput(d.date_output)) return;
    if (!editing && isPastLocalInput(d.date_output)) {
      ctx.addIssue({
        code: "custom",
        message: "La salida debe ser en el futuro",
        path: ["date_output"],
      });
    }
    if (
      isValidLocalInput(d.date_arrival) &&
      new Date(d.date_arrival) <= new Date(d.date_output)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La llegada debe ser posterior a la salida",
        path: ["date_arrival"],
      });
    }
  });
}

export type TourismFormValues = z.infer<typeof baseSchema>;

/** Valores iniciales: vacío al crear (con el servicio de la URL), o los de la excursión. */
export function formValues(
  item: DetailTourism | null,
  serviceId: string | null,
): TourismFormValues {
  return {
    id_service: item?.id_service ?? serviceId ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    date_output: toLocalInput(item?.date_output),
    date_arrival: toLocalInput(item?.date_arrival),
    quotas: item?.quotas ?? 1,
    meeting_point_address: item?.meeting_point_address ?? "",
    meeting_point_lat: item?.meeting_point_lat ?? null,
    meeting_point_lng: item?.meeting_point_lng ?? null,
    price_adult: toPrice(item?.prices?.adult),
    price_child: toPrice(item?.prices?.child),
    price_senior: toPrice(item?.prices?.senior),
    itinerary: (item?.itinerary ?? []).map(normalizeStop),
  };
}

const TIME_RE = /^(\d{1,2}):(\d{2})/;

/**
 * Parada guardada → valores del formulario. La hora va en un <input
 * type="time"> ("HH:mm"); algunas paradas antiguas tienen hora y lugar
 * invertidos ({ hour: "Hotel", place: "16:00" }) y aquí se corrigen.
 */
function normalizeStop(s: { hour?: string; place?: string }) {
  let hour = (s.hour ?? "").trim();
  let place = (s.place ?? "").trim();
  if (!TIME_RE.test(hour) && TIME_RE.test(place)) [hour, place] = [place, hour];
  const m = TIME_RE.exec(hour);
  if (m) hour = `${m[1].padStart(2, "0")}:${m[2]}`;
  else if (hour) {
    // Texto que no es hora: se conserva en el lugar para no perderlo.
    place = place ? `${hour} · ${place}` : hour;
    hour = "";
  }
  return { hour, place };
}

// Tarifas guardadas como texto ("20") también se cargan como número.
function toPrice(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Cuerpo para la API. Al editar, los cupos disponibles se ajustan a la
 * diferencia de cupos totales (no pueden quedar negativos ni superar el total).
 */
export function toPayload(
  data: TourismFormValues,
  editing: DetailTourism | null,
): CreateDetailTourismInput {
  const stops = data.itinerary
    .map((s) => ({ hour: s.hour.trim(), place: s.place.trim() }))
    // Se respeta el orden escrito: un viaje de varios días repite horas.
    .filter((s) => s.hour || s.place);
  const prices: Record<string, number> = {};
  if (data.price_adult !== undefined) prices.adult = data.price_adult;
  if (data.price_child !== undefined) prices.child = data.price_child;
  if (data.price_senior !== undefined) prices.senior = data.price_senior;
  const address = data.meeting_point_address?.trim() ?? "";
  const quotasAvailable = editing
    ? Math.min(
        data.quotas,
        Math.max(0, editing.quotas_available + (data.quotas - editing.quotas)),
      )
    : data.quotas;
  return {
    id_service: data.id_service,
    name: data.name,
    description: data.description,
    date_output: fromLocalInput(data.date_output),
    date_arrival: fromLocalInput(data.date_arrival),
    quotas: data.quotas,
    quotas_available: quotasAvailable,
    ...(address && { meeting_point_address: address }),
    // Siempre se envían: null borra un punto anterior si la dirección cambió.
    meeting_point_lat: address ? data.meeting_point_lat : null,
    meeting_point_lng: address ? data.meeting_point_lng : null,
    // Al editar se envían aunque estén vacíos, para poder borrarlos.
    ...((stops.length > 0 || editing) && { itinerary: stops }),
    ...(Object.keys(prices).length > 0
      ? { prices }
      : editing && { prices: null }),
  };
}

const MONTH_FORMAT = new Intl.DateTimeFormat("es-CO", { month: "short" });
const month = (d: Date) => MONTH_FORMAT.format(d).replace(".", "");

const TIME_FORMAT = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Salida y llegada en una línea corta: "15–16 oct 2026",
 * "30 oct – 2 nov 2026" o "31 dic 2026 – 2 ene 2027".
 */
export function formatDateRange(from: string, to: string): string {
  const a = new Date(from);
  const b = new Date(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = sameYear && a.getMonth() === b.getMonth();
  const end = `${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  if (sameMonth && a.getDate() === b.getDate()) return end;
  if (sameMonth) return `${a.getDate()}–${end}`;
  if (sameYear) return `${a.getDate()} ${month(a)} – ${end}`;
  return `${a.getDate()} ${month(a)} ${a.getFullYear()} – ${end}`;
}

/** Hora de salida y días de calendario del viaje: "Sale 07:00 · 2 días". */
export function formatTripMeta(from: string, to: string): string {
  const a = new Date(from);
  const b = new Date(to);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.max(
    1,
    Math.round((startOfDay(b) - startOfDay(a)) / 86_400_000) + 1,
  );
  return `Sale ${TIME_FORMAT.format(a)} · ${days} ${days === 1 ? "día" : "días"}`;
}

/** Tarifa sin decimales cuando es entera: 35 → "$35", 12.5 → "$12.50". */
export const formatMoney = (v: number) =>
  Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
