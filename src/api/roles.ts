import { apiClient } from "./client";
import { pageParams, type CursorPage, type ActiveCounts } from "./pagination";

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean> | null;
  active: boolean;
  /** Número de usuarios con este rol (solo en GET /roles). */
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: Record<string, boolean>;
}

const BASE = "/roles";

// El interceptor de apiClient ya desenvuelve el envelope: r.data es el payload.
export const getRoles = () => apiClient.get<Role[]>(BASE).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getRolesPage = (
  cursor: string | null,
  filters: { active?: boolean; search?: string } = {},
) =>
  apiClient
    .get<
      CursorPage<Role, ActiveCounts>
    >(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);
export const getRoleById = (id: string) =>
  apiClient.get<Role>(`${BASE}/${id}`).then((r) => r.data);
export const createRole = (body: CreateRoleInput) =>
  apiClient.post<Role>(BASE, body).then((r) => r.data);
export const updateRole = (id: string, body: Partial<CreateRoleInput>) =>
  apiClient.put<Role>(`${BASE}/${id}`, body).then((r) => r.data);
export const deleteRole = (id: string) => apiClient.delete(`${BASE}/${id}`);
