import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

export interface ServiceMode {
  name?: string;
  hours?: number;
  price_pickup?: number;
  price_dropoff?: number;
}

export interface DetailDaycare {
  id: string;
  id_service: string;
  service_mode: ServiceMode | null;
  address_point: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateDetailDaycareInput {
  id_service: string;
  service_mode?: ServiceMode;
  address_point?: string;
}

const BASE = "/detail-daycare";

export const getDetailsDaycare = () =>
  apiClient
    .get<DetailDaycare[]>(BASE)
    .then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getDetailsDaycarePage = (
  cursor: string | null,
  filters: { id_service?: string; search?: string } = {},
) =>
  apiClient
    .get<CursorPage<DetailDaycare>>(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getDetailDaycare = (id: string) =>
  apiClient
    .get<DetailDaycare>(`${BASE}/${id}`)
    .then((r) => r.data);

export const getDetailsDaycareByService = (id_service: string) =>
  apiClient
    .get<DetailDaycare[]>(`${BASE}/service/${id_service}`)
    .then((r) => r.data);

export const createDetailDaycare = (data: CreateDetailDaycareInput) =>
  apiClient
    .post<DetailDaycare>(BASE, data)
    .then((r) => r.data);

export const updateDetailDaycare = (
  id: string,
  data: Partial<CreateDetailDaycareInput>,
) =>
  apiClient
    .put<DetailDaycare>(`${BASE}/${id}`, data)
    .then((r) => r.data);

export const deleteDetailDaycare = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
