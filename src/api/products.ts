import { apiClient } from "./client";
import { pageParams, type CursorPage } from "./pagination";

export interface Product {
  id: string;
  id_category: string;
  name: string;
  description: string | null;
  price: string;
  photo: string;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const BASE = "/products";

// ── Lecturas (JSON) ───────────────────────────────────────────

export const getProducts = () =>
  apiClient.get<Product[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getProductsPage = (
  cursor: string | null,
  filters: { id_category?: string; search?: string } = {},
) =>
  apiClient
    .get<CursorPage<Product>>(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);

export const getProductById = (id: string) =>
  apiClient.get<Product>(`${BASE}/${id}`).then((r) => r.data);

export const getProductsByCategory = (id_category: string) =>
  apiClient
    .get<Product[]>(`${BASE}/category/${id_category}`)
    .then((r) => r.data);

// ── Mutaciones (multipart/form-data) ─────────────────────────
// Content-Type: undefined elimina el header JSON del cliente base,
// permitiendo que axios calcule el boundary de FormData automáticamente.

export const createProduct = (formData: FormData) =>
  apiClient
    .post<Product>(BASE, formData, { headers: { "Content-Type": undefined } })
    .then((r) => r.data);

export const updateProduct = (id: string, formData: FormData) =>
  apiClient
    .put<Product>(`${BASE}/${id}`, formData, {
      headers: { "Content-Type": undefined },
    })
    .then((r) => r.data);

export const deleteProduct = (id: string) => apiClient.delete(`${BASE}/${id}`);
