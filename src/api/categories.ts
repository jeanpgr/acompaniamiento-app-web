import { apiClient } from './client'

export interface Category {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
  active?: boolean
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>

const BASE = '/categories'

export const getCategories = () =>
  apiClient.get<Category[]>(BASE).then((r) => r.data)

export const getCategoryById = (id: string) =>
  apiClient.get<Category>(`${BASE}/${id}`).then((r) => r.data)

export const createCategory = (data: CreateCategoryInput) =>
  apiClient.post<Category>(BASE, data).then((r) => r.data)

export const updateCategory = (id: string, data: UpdateCategoryInput) =>
  apiClient.put<Category>(`${BASE}/${id}`, data).then((r) => r.data)

export const deleteCategory = (id: string) =>
  apiClient.delete(`${BASE}/${id}`)
