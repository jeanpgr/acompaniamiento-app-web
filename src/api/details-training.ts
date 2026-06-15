import { apiClient } from "./client";

export interface DetailTraining {
  id: string;
  id_service: string;
  topic: string;
  description: string;
  date_time: string;
  duration: number;
  link_meet: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateDetailTrainingInput {
  id_service: string;
  topic: string;
  description?: string;
  date_time: string;
  duration: number;
  link_meet?: string;
}

const BASE = "/detail-training";

export const getDetailsTraining = () =>
  apiClient
    .get<{ data: DetailTraining[] }>(BASE)
    .then((r) => r.data.data ?? r.data);

export const getDetailTraining = (id: string) =>
  apiClient
    .get<{ data: DetailTraining }>(`${BASE}/${id}`)
    .then((r) => r.data.data ?? r.data);

export const getDetailsTrainingByService = (id_service: string) =>
  apiClient
    .get<{ data: DetailTraining[] }>(`${BASE}/service/${id_service}`)
    .then((r) => r.data.data ?? r.data);

export const createDetailTraining = (data: CreateDetailTrainingInput) =>
  apiClient
    .post<{ data: DetailTraining }>(BASE, data)
    .then((r) => r.data.data ?? r.data);

export const updateDetailTraining = (
  id: string,
  data: Partial<CreateDetailTrainingInput>,
) =>
  apiClient
    .put<{ data: DetailTraining }>(`${BASE}/${id}`, data)
    .then((r) => r.data.data ?? r.data);

export const deleteDetailTraining = (id: string) =>
  apiClient.delete(`${BASE}/${id}`);
