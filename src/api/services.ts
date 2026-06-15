import { apiClient } from './client'

export type ServiceType = 'ACOMPAÑAMIENTO' | 'TURISMO' | 'CAPACITACION' | 'GUARDERIA'

export interface Service {
  id: string
  name: string
  description: string | null
  price: string | null          // backend stores price as decimal string
  type: ServiceType | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface CreateServiceInput {
  name: string
  description?: string
  price?: string                // backend schema: z.string().regex(/^\d+(\.\d{1,2})?$/)
  type?: ServiceType
}

const BASE = '/services'

// The Axios interceptor in client.ts already unwraps { success, data } → data,
// so r.data here is already the real payload.
export const getServices    = ()                                        => apiClient.get<Service[]>(BASE).then((r) => r.data)
export const getServiceById = (id: string)                              => apiClient.get<Service>(`${BASE}/${id}`).then((r) => r.data)
export const createService  = (body: CreateServiceInput)               => apiClient.post<Service>(BASE, body).then((r) => r.data)
export const updateService  = (id: string, body: Partial<CreateServiceInput>) => apiClient.put<Service>(`${BASE}/${id}`, body).then((r) => r.data)
export const deleteService  = (id: string)                              => apiClient.delete(`${BASE}/${id}`)
