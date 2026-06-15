import { apiClient } from "./client";
import type { SalesDetail } from "./sales-detail";

export type SalesStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export interface Sale {
  id: string;
  id_user: string;
  id_coupon: string | null;
  status: SalesStatus | null;
  subtotal: string;
  discount: string;
  total: string;
  observation: string | null;
  created_at: string;
  updated_at: string;
  details?: SalesDetail[];
}

export interface CreateSaleInput {
  id_user: string;
  id_coupon?: string;
  status?: SalesStatus;
  subtotal: string;
  discount?: string;
  total: string;
  observation?: string;
}

const BASE = "/sales";

export const getSales = () => apiClient.get<Sale[]>(BASE).then((r) => r.data);

export const getSaleById = (id: string) =>
  apiClient.get<Sale>(`${BASE}/${id}`).then((r) => r.data);

export const getSalesByUser = (id_user: string) =>
  apiClient.get<Sale[]>(`${BASE}/user/${id_user}`).then((r) => r.data);

export const createSale = (data: CreateSaleInput) =>
  apiClient.post<Sale>(BASE, data).then((r) => r.data);

export const updateSale = (id: string, data: Partial<CreateSaleInput>) =>
  apiClient.put<Sale>(`${BASE}/${id}`, data).then((r) => r.data);

export const deleteSale = (id: string) => apiClient.delete(`${BASE}/${id}`);
