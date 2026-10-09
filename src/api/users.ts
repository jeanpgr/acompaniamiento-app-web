import { apiClient } from "./client";
import { pageParams, type CursorPage, type ActiveCounts } from "./pagination";

export interface User {
  id: string;
  id_role: string | null;
  /** Nombre del rol resuelto por el backend (LEFT JOIN a role). */
  role_name: string | null;
  cedula: string | null;
  name: string;
  lastname: string | null;
  username: string | null;
  email: string;
  address: string | null;
  phone: string | null;
  /** URL firmada temporal de la foto de perfil (o null). */
  image: string | null;
  emailVerified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  lastname: string;
  email: string;
  password: string;
  id_role?: string;
  cedula?: string;
  username?: string;
  phone?: string;
  address?: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">>;

const BASE = "/users";

// Sin foto se envía JSON; con foto, multipart. `Content-Type: undefined`
// deja que axios calcule el boundary de FormData (ver products.ts).
function withPhoto(body: object, photo?: File | null) {
  if (!photo) return { data: body, config: undefined };
  const fd = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null) fd.append(key, String(value));
  }
  fd.append("photo", photo);
  return { data: fd, config: { headers: { "Content-Type": undefined } } };
}

export const getUsers = () => apiClient.get<User[]>(BASE).then((r) => r.data);

/** Perfil del usuario con sesión (la foto llega como URL firmada). */
export const getMyProfile = () =>
  apiClient.get<User | null>(`${BASE}/me`).then((r) => r.data);

/** Página por cursor (created_at DESC) para la tabla del panel. */
export const getUsersPage = (
  cursor: string | null,
  filters: { search?: string; active?: boolean } = {},
) =>
  apiClient
    .get<
      CursorPage<User, ActiveCounts>
    >(BASE, { params: pageParams(cursor, filters) })
    .then((r) => r.data);
export const createUser = (body: CreateUserInput, photo?: File | null) => {
  const { data, config } = withPhoto(body, photo);
  return apiClient.post<User>(BASE, data, config).then((r) => r.data);
};
export const updateUser = (
  id: string,
  body: UpdateUserInput,
  photo?: File | null,
) => {
  const { data, config } = withPhoto(body, photo);
  return apiClient.put<User>(`${BASE}/${id}`, data, config).then((r) => r.data);
};
export const deleteUser = (id: string) => apiClient.delete(`${BASE}/${id}`);
