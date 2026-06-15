import { apiClient } from './client'

export interface CustomerReview {
  id: string
  id_srv_schedule: string
  grade: number
  comment: string
  active: boolean
  created_at: string
  updated_at: string
}

const BASE = '/customer-reviews'

export const getReviews = () => apiClient.get<{ data: CustomerReview[] }>(BASE).then((r) => r.data.data ?? r.data)
export const getReviewById = (id: string) => apiClient.get<{ data: CustomerReview }>(`${BASE}/${id}`).then((r) => r.data.data ?? r.data)
export const getReviewsBySchedule = (scheduleId: string) => apiClient.get<{ data: CustomerReview[] }>(`${BASE}/schedule/${scheduleId}`).then((r) => r.data.data ?? r.data)
