import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

/** Tarifas por categoría de persona */
export interface TourismPrices {
  child?: number;
  adult?: number;
  senior?: number;
}

export interface DetailTourism {
  id: string;
  id_service: string;
  name: string;
  description: string;
  date_output: string;
  date_arrival: string;
  quotas: number;
  quotas_available: number;
  itinerary: { hour?: string; place?: string }[] | null;
  meeting_point_address: string | null;
  /** Punto elegido en el mapa del panel (la app abre su mapa ahí). */
  meeting_point_lat: number | null;
  meeting_point_lng: number | null;
  prices: TourismPrices | null;
  active: boolean;
  created_at: string;
}

export interface CreateDetailTourismInput {
  id_service: string;
  name: string;
  description: string;
  date_output: string;
  date_arrival: string;
  quotas: number;
  quotas_available: number;
  itinerary?: { hour?: string; place?: string }[];
  meeting_point_address?: string;
  meeting_point_lat?: number | null;
  meeting_point_lng?: number | null;
  prices?: TourismPrices;
}

const BASE = "/detail-tourism";

export const getDetailsTourism = () =>
  apiClient.get<DetailTourism[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getDetailsTourismPage = (
  cursor: string | null,
  filters: { id_service?: string; search?: string } = {},
) =>
  apiClient
    .get<
      CursorPage<DetailTourism>
    >(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getDetailTourism = (id: string) =>
  apiClient.get<DetailTourism>(`${BASE}/${id}`).then((r) => r.data);

export const getDetailsTourismByService = (id_service: string) =>
  apiClient
    .get<DetailTourism[]>(`${BASE}/service/${id_service}`)
    .then((r) => r.data);

export const createDetailTourism = (data: CreateDetailTourismInput) =>
  apiClient.post<DetailTourism>(BASE, data).then((r) => r.data);

export const updateDetailTourism = (
  id: string,
  data: Partial<CreateDetailTourismInput>,
) => apiClient.put<DetailTourism>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteDetailTourism = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
