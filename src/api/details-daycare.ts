import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

/** Días de atención, en el orden de la semana. */
export const DAYCARE_DAYS = [
  { code: "lun", label: "Lun" },
  { code: "mar", label: "Mar" },
  { code: "mie", label: "Mié" },
  { code: "jue", label: "Jue" },
  { code: "vie", label: "Vie" },
  { code: "sab", label: "Sáb" },
  { code: "dom", label: "Dom" },
] as const;

export type DaycareDay = (typeof DAYCARE_DAYS)[number]["code"];
export type PricePeriod = "dia" | "semana" | "mes";

/**
 * Modalidad (plan) de guardería, guardada como JSONB. Todo lo que no es
 * nombre/horas/precios es opcional: la app muestra solo lo que se llenó.
 */
export interface ServiceMode {
  name?: string;
  hours?: number;
  price_pickup?: number;
  price_dropoff?: number;
  /** A qué periodo corresponden los precios. */
  price_period?: PricePeriod;
  /** Descripción breve del plan para el cliente. */
  description?: string;
  days?: DaycareDay[];
  /** Horario de atención, "HH:mm". */
  start_time?: string;
  end_time?: string;
  /** Qué incluye (alimentación, actividades, cuidados…). */
  includes?: string[];
}

export interface DetailDaycare {
  id: string;
  id_service: string;
  service_mode: ServiceMode | null;
  address_point: string | null;
  /** Punto de la sede elegido en el mapa del panel. */
  address_point_lat: number | null;
  address_point_lng: number | null;
  active: boolean;
  created_at: string;
}

export interface CreateDetailDaycareInput {
  id_service: string;
  service_mode?: ServiceMode;
  address_point?: string;
  address_point_lat?: number | null;
  address_point_lng?: number | null;
}

const BASE = "/detail-daycare";

export const getDetailsDaycare = () =>
  apiClient.get<DetailDaycare[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getDetailsDaycarePage = (
  cursor: string | null,
  filters: { id_service?: string; search?: string } = {},
) =>
  apiClient
    .get<
      CursorPage<DetailDaycare>
    >(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getDetailDaycare = (id: string) =>
  apiClient.get<DetailDaycare>(`${BASE}/${id}`).then((r) => r.data);

export const getDetailsDaycareByService = (id_service: string) =>
  apiClient
    .get<DetailDaycare[]>(`${BASE}/service/${id_service}`)
    .then((r) => r.data);

export const createDetailDaycare = (data: CreateDetailDaycareInput) =>
  apiClient.post<DetailDaycare>(BASE, data).then((r) => r.data);

export const updateDetailDaycare = (
  id: string,
  data: Partial<CreateDetailDaycareInput>,
) => apiClient.put<DetailDaycare>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteDetailDaycare = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
