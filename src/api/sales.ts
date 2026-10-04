import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

/** Estado de entrega del pedido (enum status_sales). */
export type SalesStatus = "POR_ENTREGAR" | "EN_ENTREGA" | "ENTREGADO" | "CANCELADO";

export interface OrderItem {
  id: string;
  id_product: string;
  name: string;
  /** URL firmada temporal de la foto del producto. */
  photo: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderCustomer {
  id: string;
  name: string;
  lastname: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

/** Pedido tal como lo devuelve GET /sales (montos como número). */
export interface Order {
  id: string;
  code: string;
  status: SalesStatus;
  status_label: string;
  subtotal: number;
  discount: number;
  total: number;
  coupon: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  whatsapp_url: string | null;
  customer?: OrderCustomer;
}

/** Mismas transiciones que valida el backend (sales.models.ts). */
export const SALE_STATUS_TRANSITIONS: Record<SalesStatus, SalesStatus[]> = {
  POR_ENTREGAR: ["EN_ENTREGA", "ENTREGADO", "CANCELADO"],
  EN_ENTREGA: ["POR_ENTREGAR", "ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

const BASE = "/sales";

export const getSales = () => apiClient.get<Order[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getSalesPage = (
  cursor: string | null,
  filters: { search?: string; status?: SalesStatus } = {},
) =>
  apiClient
    .get<CursorPage<Order, Record<SalesStatus, number>>>(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getSaleById = (id: string) =>
  apiClient.get<Order>(`${BASE}/${id}`).then((r) => r.data);

export const getSalesByUser = (id_user: string) =>
  apiClient.get<Order[]>(`${BASE}/user/${id_user}`).then((r) => r.data);

/** Cambia el estado de entrega. Cancelar devuelve el stock y el uso del cupón. */
export const updateSaleStatus = (
  id: string,
  status: SalesStatus,
  observation?: string,
) =>
  apiClient
    .put<Order>(`${BASE}/${id}/status`, { status, observation })
    .then((r) => r.data);

export const deleteSale = (id: string) => apiClient.delete(`${BASE}/${id}`);
