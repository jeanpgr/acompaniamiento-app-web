import { apiClient } from "./client";

export type ScheduleStatus = "PENDIENTE" | "EN CURSO" | "COMPLETADO";

// ─── Acompañamiento ──────────────────────────────────────────────────────────
export interface ScheduleAcompan {
  id: string;
  id_service: string;
  id_vehicle: string;
  origin_address: string;
  destination_address: string;
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
  id_vehicle: string;
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
    .get<{ data: ScheduleAcompan[] }>("/schedule-acompan")
    .then((r) => r.data.data ?? r.data);
export const createScheduleAcompan = (body: CreateScheduleAcompanInput) =>
  apiClient
    .post<{ data: ScheduleAcompan }>("/schedule-acompan", body)
    .then((r) => r.data.data ?? r.data);
export const updateScheduleAcompan = (
  id: string,
  body: Partial<ScheduleAcompan>,
) =>
  apiClient
    .put<{ data: ScheduleAcompan }>(`/schedule-acompan/${id}`, body)
    .then((r) => r.data.data ?? r.data);
export const deleteScheduleAcompan = (id: string) =>
  apiClient.delete(`/schedule-acompan/${id}`);

// ─── Turismo ─────────────────────────────────────────────────────────────────
export interface ScheduleTourism {
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
    .get<{ data: ScheduleTourism[] }>("/schedule-tourism")
    .then((r) => r.data.data ?? r.data);
export const updateScheduleTourism = (
  id: string,
  body: Partial<ScheduleTourism>,
) =>
  apiClient
    .put<{ data: ScheduleTourism }>(`/schedule-tourism/${id}`, body)
    .then((r) => r.data.data ?? r.data);

// ─── Capacitación ────────────────────────────────────────────────────────────
export interface ScheduleTraining {
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
    .get<{ data: ScheduleTraining[] }>("/schedule-training")
    .then((r) => r.data.data ?? r.data);
export const updateScheduleTraining = (
  id: string,
  body: Partial<ScheduleTraining>,
) =>
  apiClient
    .put<{ data: ScheduleTraining }>(`/schedule-training/${id}`, body)
    .then((r) => r.data.data ?? r.data);

// ─── Guardería ───────────────────────────────────────────────────────────────
export interface ScheduleDaycare {
  id: string;
  id_detail_daycare: string;
  id_vehicle: string;
  name: string | null;
  lastname: string | null;
  transfer: "PICK_HOME" | "TO_CARRY" | null;
  address_pick_home: string | null;
  status: ScheduleStatus | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  detail?: { id: string };
  vehicle?: { id: string; name: string; license_plate: string };
}

export const getSchedulesDaycare = () =>
  apiClient
    .get<{ data: ScheduleDaycare[] }>("/schedule-daycare")
    .then((r) => r.data.data ?? r.data);
export const updateScheduleDaycare = (
  id: string,
  body: Partial<ScheduleDaycare>,
) =>
  apiClient
    .put<{ data: ScheduleDaycare }>(`/schedule-daycare/${id}`, body)
    .then((r) => r.data.data ?? r.data);
