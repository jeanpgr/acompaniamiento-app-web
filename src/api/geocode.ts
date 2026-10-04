import { apiClient } from "./client";

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
}

/** Busca una dirección de texto (proxy del backend hacia OpenStreetMap). */
export const searchAddress = (query: string) =>
  apiClient
    .get<GeocodeResult[]>("/geocode/search", { params: { q: query } })
    .then((r) => r.data);
