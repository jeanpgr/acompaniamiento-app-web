import type { UseQueryResult } from "@tanstack/react-query";
import {
  updateScheduleAcompan,
  updateScheduleTourism,
  updateScheduleTraining,
  updateScheduleDaycare,
  markRefundCompleteAcompan,
  markRefundCompleteTourism,
  markRefundCompleteTraining,
  markRefundCompleteDaycare,
  type ScheduleAcompan,
  type ScheduleTourism,
  type ScheduleTraining,
  type ScheduleDaycare,
  type ScheduleStatus,
  type RefundStatus,
  type RefundFields,
  type CouponFields,
} from "@/api/schedules";
import type { MapPoint } from "@/components/ui/AddressMap";
import { personNames } from "@/lib/persons";

// ── Cita unificada (los 4 tipos de agendamiento en una sola forma) ──

export type OriginalType = "acompan" | "tourism" | "training" | "daycare";

export interface Unified {
  id: string;
  originalType: OriginalType;
  serviceType: string; // para el color del badge
  title: string; // nombre del servicio / viaje / tema
  personName: string; // persona que agenda
  dateTime: string; // fecha de referencia
  status: ScheduleStatus | null;
  address?: string;
  /** Direcciones para "Ver en mapa" (con el punto exacto si vino de la app). */
  mapPoints?: MapPoint[];
  needsVehicle: boolean; // CAPACITACION no necesita vehículo
  vehicleId?: string;
  refundStatus: RefundStatus | null;
  refundBank: string | null;
  refundAccount: string | null;
  refundAccountType: string | null;
  refundHolderCedula: string | null;
  /** Cupón con que se contrató (null = sin cupón). */
  couponCode: string | null;
  discountAmount: string | null;
}

const couponOf = (s: CouponFields) => ({
  couponCode: s.coupon_code ?? null,
  discountAmount: s.discount_amount ?? null,
});

const refundOf = (s: RefundFields) => ({
  refundStatus: s.refund_status,
  refundBank: s.refund_bank_name,
  refundAccount: s.refund_bank_account,
  refundAccountType: s.refund_account_type,
  refundHolderCedula: s.refund_holder_cedula,
});

function normalizeAcompan(s: ScheduleAcompan): Unified {
  return {
    id: s.id,
    originalType: "acompan",
    serviceType: s.service?.type ?? "ACOMPAÑAMIENTO",
    title: s.service?.name ?? "Acompañamiento",
    personName: s.reference,
    dateTime: s.date_time,
    status: s.status,
    address: s.origin_address,
    mapPoints: [
      {
        label: "Origen",
        address: s.origin_address,
        lat: s.origin_lat,
        lng: s.origin_lng,
      },
      {
        label: "Destino",
        address: s.destination_address,
        lat: s.destination_lat,
        lng: s.destination_lng,
      },
    ],
    needsVehicle: true,
    vehicleId: s.id_vehicle ?? undefined,
    ...refundOf(s),
    ...couponOf(s),
  };
}

function normalizeTourism(s: ScheduleTourism): Unified {
  return {
    id: s.id,
    originalType: "tourism",
    serviceType: "TURISMO",
    title: s.detail?.name ?? "Turismo",
    personName: personNames(s.names_persons).join(", ") || s.phone_responsible,
    dateTime: s.detail?.date_output ?? s.created_at,
    status: s.status,
    needsVehicle: true,
    vehicleId: s.id_vehicle,
    ...refundOf(s),
    ...couponOf(s),
  };
}

function normalizeTraining(s: ScheduleTraining): Unified {
  return {
    id: s.id,
    originalType: "training",
    serviceType: "CAPACITACION",
    title: s.detail?.topic ?? "Capacitación",
    personName: [s.name, s.lastname].filter(Boolean).join(" "),
    dateTime: s.detail?.date_time ?? s.created_at,
    status: s.status,
    needsVehicle: false,
    ...refundOf(s),
    ...couponOf(s),
  };
}

function normalizeDaycare(s: ScheduleDaycare): Unified {
  return {
    id: s.id,
    originalType: "daycare",
    serviceType: "GUARDERIA",
    title: "Guardería Adulto Mayor",
    personName: [s.name, s.lastname].filter(Boolean).join(" ") || "—",
    dateTime: s.created_at,
    status: s.status,
    address: s.address_pick_home ?? undefined,
    mapPoints: s.address_pick_home
      ? [
          {
            label: "Recogida a domicilio",
            address: s.address_pick_home,
            lat: s.pick_home_lat,
            lng: s.pick_home_lng,
          },
        ]
      : undefined,
    // Si la familia lleva al adulto a la sede no hace falta vehículo.
    needsVehicle: s.transfer === "PICK_HOME",
    vehicleId: s.id_vehicle ?? undefined,
    ...refundOf(s),
    ...couponOf(s),
  };
}

/**
 * `combine` de useQueries: une los 4 listados en uno ordenado por fecha.
 * Definido fuera del componente para que no se recalcule en cada render.
 */
export function combineSchedules(
  results: [
    UseQueryResult<ScheduleAcompan[]>,
    UseQueryResult<ScheduleTourism[]>,
    UseQueryResult<ScheduleTraining[]>,
    UseQueryResult<ScheduleDaycare[]>,
  ],
) {
  const [acompan, tourism, training, daycare] = results;
  const schedules: Unified[] = [
    ...(acompan.data ?? []).map(normalizeAcompan),
    ...(tourism.data ?? []).map(normalizeTourism),
    ...(training.data ?? []).map(normalizeTraining),
    ...(daycare.data ?? []).map(normalizeDaycare),
  ].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  );
  return { schedules, isLoading: results.some((r) => r.isLoading) };
}

const awaitingStatus = (s: Unified) => !s.status || s.status === "PENDIENTE";

/**
 * Cola "Sin asignar": servicios con el pago confirmado (PAGADO) que necesitan
 * vehículo y aún no lo tienen. Una vez asignado, el conductor lo ve y lo pasa
 * a EN CURSO y COMPLETADO.
 */
export function isPending(s: Unified) {
  return s.needsVehicle && s.status === "PAGADO" && !s.vehicleId;
}

/** Recién contratado: el equipo confirma el pago al recibir el comprobante. */
export function awaitingPayment(s: Unified) {
  return awaitingStatus(s);
}

export const STATUS_LABEL: Record<ScheduleStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  "EN CURSO": "En ruta",
  COMPLETADO: "Completado",
  OLVIDADA: "Olvidada",
  CANCELADA: "Cancelada",
};

/** Etiqueta del estado de una cita ("En ruta" = EN CURSO, solo acompañamiento). */
export function statusLabelOf(s: Pick<Unified, "status" | "originalType">) {
  return STATUS_LABEL[s.status ?? "PENDIENTE"];
}

/** Color del distintivo de cada estado (variantes de <Badge>). */
export const STATUS_VARIANT: Record<
  ScheduleStatus,
  "warning" | "info" | "success" | "danger" | "default"
> = {
  PENDIENTE: "warning",
  PAGADO: "success",
  "EN CURSO": "info",
  COMPLETADO: "success",
  OLVIDADA: "default",
  CANCELADA: "danger",
};

// ── Acciones por tipo de cita ──

/**
 * Asigna el vehículo (si aplica) sin tocar el estado: el pago se confirma
 * aparte ("PAGADO") y en acompañamiento el conductor la pasa a "EN CURSO".
 * Si la cita no usa vehículo, asignar equivale a confirmar el pago.
 */
export function assignSchedule(
  s: Unified,
  vehicleId: string,
): Promise<unknown> {
  switch (s.originalType) {
    case "acompan":
      // Solo asigna el vehículo: el estado ("En ruta", "Completado") lo
      // cambia el conductor de ese vehículo desde su módulo Acompañamiento.
      return updateScheduleAcompan(s.id, { id_vehicle: vehicleId });
    case "tourism":
      return updateScheduleTourism(s.id, { id_vehicle: vehicleId });
    case "daycare":
      // Con recogida se asigna vehículo; si la familia lo lleva, solo se confirma.
      return updateScheduleDaycare(
        s.id,
        s.needsVehicle ? { id_vehicle: vehicleId } : { status: "PAGADO" },
      );
    case "training":
      // Capacitación no usa vehículo: solo se confirma.
      return updateScheduleTraining(s.id, { status: "PAGADO" });
  }
}

/** Confirma el pago de cualquier servicio: la cita pasa a "PAGADO". */
export function confirmPaymentSchedule(s: Unified): Promise<unknown> {
  switch (s.originalType) {
    case "tourism":
      return updateScheduleTourism(s.id, { status: "PAGADO" });
    case "daycare":
      return updateScheduleDaycare(s.id, { status: "PAGADO" });
    case "training":
      return updateScheduleTraining(s.id, { status: "PAGADO" });
    case "acompan":
      return updateScheduleAcompan(s.id, { status: "PAGADO" });
  }
}

export const markRefundComplete: Record<
  OriginalType,
  (id: string) => Promise<unknown>
> = {
  acompan: markRefundCompleteAcompan,
  tourism: markRefundCompleteTourism,
  training: markRefundCompleteTraining,
  daycare: markRefundCompleteDaycare,
};

// ── Filtros ──

export type FilterTab = "todos" | OriginalType;

export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "acompan", label: "Acompañamiento" },
  { key: "tourism", label: "Turismo" },
  { key: "training", label: "Capacitación" },
  { key: "daycare", label: "Guardería" },
];

// ── Fechas ──

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
