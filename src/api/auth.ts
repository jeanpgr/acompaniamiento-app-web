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
  role: string;
  permissions: string[];
}

export interface SignInResponse {
  token: string;
  user: AuthUser;
}

export const signIn = (email: string, password: string) =>
  apiClient
    .post<SignInResponse>("/auth/sign-in", { email, password })
    .then((r) => r.data);

export const getSession = () =>
  apiClient.get<AuthUser>("/auth/session").then((r) => r.data);
