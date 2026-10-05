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

/** Dirección de un punto del mapa (null si no se pudo resolver). */
export const reverseGeocode = (lat: number, lng: number) =>
  apiClient
    .get<GeocodeResult | null>("/geocode/reverse", { params: { lat, lng } })
    .then((r) => r.data);
