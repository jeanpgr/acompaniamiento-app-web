import { apiClient } from './client'

export interface Vehicle {
  id: string
  id_driver: string
  name: string
  model: string
  license_plate: string
  capacity: number | null
  next_review: string | null
  active: boolean
  created_at: string
  updated_at: string
  driver?: { id: string; name: string; lastname: string }
}

export interface CreateVehicleInput {
  id_driver: string
  name: string
  model: string
  license_plate: string
  capacity?: number
  next_review?: string
}

const BASE = '/vehicles'

export const getVehicles = () => apiClient.get<{ data: Vehicle[] }>(BASE).then((r) => r.data.data ?? r.data)
export const getVehicleById = (id: string) => apiClient.get<{ data: Vehicle }>(`${BASE}/${id}`).then((r) => r.data.data ?? r.data)
export const getVehiclesByDriver = (driverId: string) => apiClient.get<{ data: Vehicle[] }>(`${BASE}/driver/${driverId}`).then((r) => r.data.data ?? r.data)
export const createVehicle = (body: CreateVehicleInput) => apiClient.post<{ data: Vehicle }>(BASE, body).then((r) => r.data.data ?? r.data)
export const updateVehicle = (id: string, body: Partial<CreateVehicleInput>) => apiClient.put<{ data: Vehicle }>(`${BASE}/${id}`, body).then((r) => r.data.data ?? r.data)
export const deleteVehicle = (id: string) => apiClient.delete(`${BASE}/${id}`)
