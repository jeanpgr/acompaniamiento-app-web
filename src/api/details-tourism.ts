import { apiClient } from "./client";

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
  prices?: TourismPrices;
}

const BASE = "/detail-tourism";

export const getDetailsTourism = () =>
  apiClient
    .get<{ data: DetailTourism[] }>(BASE)
    .then((r) => r.data.data ?? r.data);

export const getDetailTourism = (id: string) =>
  apiClient
    .get<{ data: DetailTourism }>(`${BASE}/${id}`)
    .then((r) => r.data.data ?? r.data);

export const getDetailsTourismByService = (id_service: string) =>
  apiClient
    .get<{ data: DetailTourism[] }>(`${BASE}/service/${id_service}`)
    .then((r) => r.data.data ?? r.data);

export const createDetailTourism = (data: CreateDetailTourismInput) =>
  apiClient
    .post<{ data: DetailTourism }>(BASE, data)
    .then((r) => r.data.data ?? r.data);

export const updateDetailTourism = (
  id: string,
  data: Partial<CreateDetailTourismInput>,
) =>
  apiClient
    .put<{ data: DetailTourism }>(`${BASE}/${id}`, data)
    .then((r) => r.data.data ?? r.data);

export const deleteDetailTourism = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
