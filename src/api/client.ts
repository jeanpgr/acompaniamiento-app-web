import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";

/**
 * Extrae el mensaje de error del backend, o retorna el fallback. Las
 * validaciones (400 "Datos inválidos") traen en `error` qué campo falló; se
 * agrega para que el usuario sepa qué corregir.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: string; error?: unknown }>(err)) {
    const data = err.response?.data;
    const message = data?.message || fallback;
    const detail = typeof data?.error === "string" ? data.error.trim() : "";
    return detail && detail !== message ? `${message}: ${detail}` : message;
  }
  return fallback;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap the backend's { success, data, message, statusCode } envelope.
// Every successful response has this shape; we pull out `data` so that
// callers can do `.then(r => r.data)` and get the actual payload directly.
apiClient.interceptors.response.use(
  (response) => {
    if (
      response.data !== null &&
      typeof response.data === "object" &&
      response.data.success === true &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
