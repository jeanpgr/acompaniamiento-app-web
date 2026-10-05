import { redirect } from "react-router-dom";
import type { AuthUser } from "@/api/auth";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Loaders del router ────────────────────────────────────────
// La sesión se revisa antes de mostrar la ruta, no dentro de un
// componente: sin sesión no llega a pintarse el panel. Si el token vence
// a mitad de uso, el interceptor de 401 (api/client.ts) manda a /login.
// https://reactrouter.com/api/utils/redirect

/** Rutas del panel: exige sesión y entrega el usuario al layout. */
export function requireAuthLoader() {
  if (!getStoredToken()) throw redirect("/login");
  return { user: getStoredUser() };
}

/** /login: si ya hay sesión, va directo al panel. */
export function guestOnlyLoader() {
  if (getStoredToken()) throw redirect("/dashboard");
  return null;
}
