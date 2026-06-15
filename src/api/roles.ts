import { apiClient } from "./client";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: Record<string, boolean>;
}

const BASE = "/roles";

export const getRoles = () =>
  apiClient.get<{ data: Role[] }>(BASE).then((r) => r.data.data ?? r.data);
export const getRoleById = (id: string) =>
  apiClient
    .get<{ data: Role }>(`${BASE}/${id}`)
    .then((r) => r.data.data ?? r.data);
export const createRole = (body: CreateRoleInput) =>
  apiClient.post<{ data: Role }>(BASE, body).then((r) => r.data.data ?? r.data);
export const updateRole = (id: string, body: Partial<CreateRoleInput>) =>
  apiClient
    .put<{ data: Role }>(`${BASE}/${id}`, body)
    .then((r) => r.data.data ?? r.data);
export const deleteRole = (id: string) => apiClient.delete(`${BASE}/${id}`);
