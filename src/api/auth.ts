import { apiClient } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  lastname: string;
  username: string;
  email: string;
  phone: string;
  address: string;
  active: boolean;
  role: string | null;
  // JSONB del rol: { "<módulo>": true | false }
  permissions: Record<string, boolean>;
}

export interface SignInResponse {
  token: string;
  user: AuthUser;
}

export const signIn = (email: string, password: string) =>
  apiClient
    .post<SignInResponse>("/auth/sign-in", { email, password })
    .then((r) => r.data);

/**
 * Cambia la contraseña del usuario con sesión. El backend cierra las demás
 * sesiones y devuelve un token nuevo para esta.
 */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiClient
    .post<{ token: string | null }>("/auth/change-password", {
      currentPassword,
      newPassword,
    })
    .then((r) => r.data);

export const getSession = () =>
  apiClient.get<AuthUser>("/auth/session").then((r) => r.data);
