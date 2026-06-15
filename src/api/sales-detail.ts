import { apiClient } from './client'

export interface SalesDetail {
  id: string
  id_sale: string
  id_product: string
  quantity: number
  unit_price: string
  discount: string
  subtotal: string
  created_at: string
}

export interface CreateSalesDetailInput {
  id_sale: string
  id_product: string
  quantity: number
  unit_price: string
  discount?: string
  subtotal: string
}

const BASE = '/sales-detail'

export const getSalesDetailBySale = (id_sale: string) =>
  apiClient.get<SalesDetail[]>(`${BASE}/sale/${id_sale}`).then((r) => r.data)

export const getSalesDetailById = (id: string) =>
  apiClient.get<SalesDetail>(`${BASE}/${id}`).then((r) => r.data)

export const createSalesDetail = (data: CreateSalesDetailInput) =>
  apiClient.post<SalesDetail>(BASE, data).then((r) => r.data)

export const deleteSalesDetail = (id: string) =>
  apiClient.delete(`${BASE}/${id}`)
