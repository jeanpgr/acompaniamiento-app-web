import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

export type ScheduleStatus =
  | "PENDIENTE"
  | "EN CURSO"
  | "COMPLETADO"
  | "OLVIDADA"
  | "CANCELADA";

export type RefundStatus = "EN_PROCESO" | "REALIZADO";

/** Campos de reembolso presentes en las 4 tablas de agendamiento. */
export interface RefundFields {
  id_user?: string | null;
  refund_status: RefundStatus | null;
  refund_bank_name: string | null;
  refund_bank_account: string | null;
  refund_account_type: string | null;
  refund_holder_cedula: string | null;
  cancelled_at: string | null;
}

// ─── Acompañamiento ──────────────────────────────────────────────────────────
export interface ScheduleAcompan extends RefundFields {
  id: string;
  id_service: string;
  /** null hasta que el administrador asigna un vehículo. */
  id_vehicle: string | null;
  origin_address: string;
  destination_address: string;
  /** Puntos elegidos en el mapa de la app (null si se escribió a mano). */
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  date_time: string;
  name_contact_emergency: string;
  contact_emergency: string;
  reference: string;
  status: ScheduleStatus | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  service?: { id: string; name: string; type: string };
  vehicle?: { id: string; name: string; license_plate: string };
}

export interface CreateScheduleAcompanInput {
  id_service: string;
  id_vehicle?: string | null;
  origin_address: string;
  destination_address: string;
  date_time: string;
  name_contact_emergency: string;
  contact_emergency: string;
  reference: string;
  status?: ScheduleStatus;
}

export const getSchedulesAcompan = () =>
  apiClient
    .get<ScheduleAcompan[]>("/schedule-acompan")
    .then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getSchedulesAcompanPage = (
  cursor: string | null,
  filters: { status?: ScheduleStatus; search?: string } = {},
) =>
  apiClient
    .get<CursorPage<ScheduleAcompan, Record<ScheduleStatus, number>>>("/schedule-acompan", { params: pageParams(cursor, filters) })
    .then((r) => r.data);
export const createScheduleAcompan = (body: CreateScheduleAcompanInput) =>
  apiClient
    .post<ScheduleAcompan>("/schedule-acompan", body)
    .then((r) => r.data);
export const updateScheduleAcompan = (
  id: string,
  body: Partial<ScheduleAcompan>,
) =>
  apiClient
    .put<ScheduleAcompan>(`/schedule-acompan/${id}`, body)
    .then((r) => r.data);
export const markRefundCompleteAcompan = (id: string) =>
  apiClient
    .put<ScheduleAcompan>(`/schedule-acompan/${id}/refund-complete`)
    .then((r) => r.data);
export const deleteScheduleAcompan = (id: string) =>
  apiClient.delete(`/schedule-acompan/${id}`);

// ─── Turismo ─────────────────────────────────────────────────────────────────
export interface ScheduleTourism extends RefundFields {
  id: string;
  id_detail_tourism: string;
  id_vehicle: string;
  names_persons: string[];
  quotas: number;
  phone_responsible: string;
  price_pay: string | null;
  status: ScheduleStatus | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  detail?: { id: string; name: string; date_output: string };
  vehicle?: { id: string; name: string; license_plate: string };
}

export const getSchedulesTourism = () =>
  apiClient
    .get<ScheduleTourism[]>("/schedule-tourism")
    .then((r) => r.data);
export const updateScheduleTourism = (
  id: string,
  body: Partial<ScheduleTourism>,
) =>
  apiClient
    .put<ScheduleTourism>(`/schedule-tourism/${id}`, body)
    .then((r) => r.data);
export const markRefundCompleteTourism = (id: string) =>
  apiClient
    .put<ScheduleTourism>(`/schedule-tourism/${id}/refund-complete`)
    .then((r) => r.data);

// ─── Capacitación ────────────────────────────────────────────────────────────
export interface ScheduleTraining extends RefundFields {
  id: string;
  id_detail_training: string;
  name: string;
  lastname: string;
  phone: string;
  status: ScheduleStatus | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  detail?: { id: string; topic: string; date_time: string; link_meet: string };
}

export const getSchedulesTraining = () =>
  apiClient
    .get<ScheduleTraining[]>("/schedule-training")
    .then((r) => r.data);
export const updateScheduleTraining = (
  id: string,
  body: Partial<ScheduleTraining>,
) =>
  apiClient
    .put<ScheduleTraining>(`/schedule-training/${id}`, body)
    .then((r) => r.data);
export const markRefundCompleteTraining = (id: string) =>
  apiClient
    .put<ScheduleTraining>(`/schedule-training/${id}/refund-complete`)
    .then((r) => r.data);

// ─── Guardería ───────────────────────────────────────────────────────────────
export interface ScheduleDaycare extends RefundFields {
  id: string;
  id_detail_daycare: string;
  id_vehicle: string;
  name: string | null;
  lastname: string | null;
  transfer: "PICK_HOME" | "TO_CARRY" | null;
  address_pick_home: string | null;
  /** Punto de recogida elegido en el mapa de la app. */
  pick_home_lat: number | null;
  pick_home_lng: number | null;
  status: ScheduleStatus | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  detail?: { id: string };
  vehicle?: { id: string; name: string; license_plate: string };
}

export const getSchedulesDaycare = () =>
  apiClient
    .get<ScheduleDaycare[]>("/schedule-daycare")
    .then((r) => r.data);
export const updateScheduleDaycare = (
  id: string,
  body: Partial<ScheduleDaycare>,
) =>
  apiClient
    .put<ScheduleDaycare>(`/schedule-daycare/${id}`, body)
    .then((r) => r.data);
export const markRefundCompleteDaycare = (id: string) =>
  apiClient
    .put<ScheduleDaycare>(`/schedule-daycare/${id}/refund-complete`)
    .then((r) => r.data);
