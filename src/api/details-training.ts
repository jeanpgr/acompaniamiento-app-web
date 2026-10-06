import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

export interface DetailTraining {
  id: string;
  id_service: string;
  topic: string;
  description: string;
  date_time: string;
  duration: number;
  link_meet: string | null;
  /** Precio del taller como string decimal ("15.50"). NULL = gratuito */
  price: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateDetailTrainingInput {
  id_service: string;
  topic: string;
  description?: string;
  date_time: string;
  duration: number;
  /** null borra el enlace al editar. */
  link_meet?: string | null;
  /** String decimal, ej. "15.50". Omitir = gratuito; null lo vuelve gratuito al editar. */
  price?: string | null;
}

const BASE = "/detail-training";

export const getDetailsTraining = () =>
  apiClient.get<DetailTraining[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getDetailsTrainingPage = (
  cursor: string | null,
  filters: { id_service?: string; search?: string } = {},
) =>
  apiClient
    .get<
      CursorPage<DetailTraining>
    >(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getDetailTraining = (id: string) =>
  apiClient.get<DetailTraining>(`${BASE}/${id}`).then((r) => r.data);

export const getDetailsTrainingByService = (id_service: string) =>
  apiClient
    .get<DetailTraining[]>(`${BASE}/service/${id_service}`)
    .then((r) => r.data);

export const createDetailTraining = (data: CreateDetailTrainingInput) =>
  apiClient.post<DetailTraining>(BASE, data).then((r) => r.data);

export const updateDetailTraining = (
  id: string,
  data: Partial<CreateDetailTrainingInput>,
) => apiClient.put<DetailTraining>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteDetailTraining = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
