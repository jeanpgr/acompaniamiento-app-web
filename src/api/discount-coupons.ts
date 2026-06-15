import { apiClient } from './client'

export interface DiscountCoupon {
  id: string
  coupon: string
  times_used: number
  times_allowed: number
  discount_percentage: number
  active: boolean
  expired_at: string
  created_at: string
  updated_at: string
}

export interface CreateDiscountCouponInput {
  coupon: string
  times_used?: number
  times_allowed: number
  discount_percentage: number
  active?: boolean
  expired_at: string
}

const BASE = '/discount-coupons'

export const getDiscountCoupons = () =>
  apiClient.get<DiscountCoupon[]>(BASE).then((r) => r.data)

export const getDiscountCouponById = (id: string) =>
  apiClient.get<DiscountCoupon>(`${BASE}/${id}`).then((r) => r.data)

export const createDiscountCoupon = (data: CreateDiscountCouponInput) =>
  apiClient.post<DiscountCoupon>(BASE, data).then((r) => r.data)

export const updateDiscountCoupon = (id: string, data: Partial<CreateDiscountCouponInput>) =>
  apiClient.put<DiscountCoupon>(`${BASE}/${id}`, data).then((r) => r.data)

export const deleteDiscountCoupon = (id: string) =>
  apiClient.delete(`${BASE}/${id}`)
