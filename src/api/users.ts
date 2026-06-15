import { apiClient } from './client'

export interface User {
  id: string
  id_role: string | null
  cedula: string | null
  name: string
  lastname: string | null
  username: string | null
  email: string
  address: string | null
  phone: string | null
  image: string | null
  emailVerified: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  name: string
  lastname: string
  email: string
  password: string
  id_role?: string
  cedula?: string
  username?: string
  phone?: string
  address?: string
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>>

const BASE = '/users'

export const getUsers    = ()                                         => apiClient.get<User[]>(BASE).then((r) => r.data)
export const createUser  = (body: CreateUserInput)                    => apiClient.post<User>(BASE, body).then((r) => r.data)
export const updateUser  = (id: string, body: UpdateUserInput)        => apiClient.put<User>(`${BASE}/${id}`, body).then((r) => r.data)
export const deleteUser  = (id: string)                               => apiClient.delete(`${BASE}/${id}`)
