import { apiClient } from "./client";

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
    .get<{ data: DetailDaycare[] }>(BASE)
    .then((r) => r.data.data ?? r.data);

export const getDetailDaycare = (id: string) =>
  apiClient
    .get<{ data: DetailDaycare }>(`${BASE}/${id}`)
    .then((r) => r.data.data ?? r.data);

export const getDetailsDaycareByService = (id_service: string) =>
  apiClient
    .get<{ data: DetailDaycare[] }>(`${BASE}/service/${id_service}`)
    .then((r) => r.data.data ?? r.data);

export const createDetailDaycare = (data: CreateDetailDaycareInput) =>
  apiClient
    .post<{ data: DetailDaycare }>(BASE, data)
    .then((r) => r.data.data ?? r.data);

export const updateDetailDaycare = (
  id: string,
  data: Partial<CreateDetailDaycareInput>,
) =>
  apiClient
    .put<{ data: DetailDaycare }>(`${BASE}/${id}`, data)
    .then((r) => r.data.data ?? r.data);

export const deleteDetailDaycare = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
