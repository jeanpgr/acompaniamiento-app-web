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
  /** Fotos del lugar (URL firmada, máx. 3). */
  photos: string[];
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
  /** null borra las tarifas al editar. */
  prices?: TourismPrices | null;
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

/** Sube fotos del lugar (entre todas, máx. 3 por excursión). */
export const uploadTourismPhotos = (id: string, files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append("photos", f));
  return apiClient
    .post<DetailTourism>(`${BASE}/${id}/photos`, form, {
      headers: { "Content-Type": undefined },
    })
    .then((r) => r.data);
};

/** Quita una foto por su posición (0 = primera). */
export const deleteTourismPhoto = (id: string, index: number) =>
  apiClient
    .delete<DetailTourism>(`${BASE}/${id}/photos/${index}`)
    .then((r) => r.data);

/** Cambios de fotos pedidos en el formulario. */
export interface PhotoChanges {
  /** Posiciones originales de las fotos guardadas que se quitan. */
  remove: number[];
  add: File[];
}

/**
 * Aplica los cambios de fotos: primero quita (de mayor a menor posición, para
 * que los índices sigan valiendo) y luego sube las nuevas.
 */
export async function syncTourismPhotos(id: string, changes: PhotoChanges) {
  for (const index of [...changes.remove].sort((a, b) => b - a)) {
    await deleteTourismPhoto(id, index);
  }
  if (changes.add.length) await uploadTourismPhotos(id, changes.add);
}
