import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  /** Punto marcado (null: aún no se eligió). */
  point: LatLng | null;
  /** Se toca el mapa o se arrastra el pin. */
  onPick: (point: LatLng) => void;
}

// Vista inicial sin punto: Ecuador completo.
const ECUADOR: [number, number] = [-1.83, -78.18];

const PIN_HTML =
  '<span class="flex items-center justify-center w-8 h-8 rounded-full rounded-br-none rotate-45 shadow-md ring-2 ring-white bg-primary"><span class="-rotate-45 w-2.5 h-2.5 rounded-full bg-white"></span></span>';

/**
 * Mapa (OpenStreetMap + Leaflet) para elegir un punto: tocar el mapa coloca
 * el pin y el pin se puede arrastrar para afinar. Se carga bajo demanda
 * (lazy) desde MapPickerModal, igual que AddressMap.
 */
export default function LocationPicker({ point, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Siempre la última función, sin recrear el mapa cuando cambia.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  // Crear el mapa una sola vez.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.setView(ECUADOR, 6);
    map.on("click", (e: L.LeafletMouseEvent) =>
      onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }),
    );
    mapRef.current = map;
    // El mapa se crea dentro de un diálogo que aún está animándose.
    const resize = window.setTimeout(() => map.invalidateSize(), 250);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Mover (o crear) el pin cuando cambia el punto.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point) return;
    if (!markerRef.current) {
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: PIN_HTML,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }),
        title: "Punto elegido (arrastra para ajustar)",
        alt: "Punto elegido",
      }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onPickRef.current({ lat, lng });
      });
      markerRef.current = marker;
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16));
    } else {
      markerRef.current.setLatLng([point.lat, point.lng]);
      if (!map.getBounds().contains([point.lat, point.lng])) {
        map.panTo([point.lat, point.lng]);
      }
    }
  }, [point]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa: toca para marcar el punto o arrastra el pin para ajustarlo"
      className="h-80 w-full rounded-lg border border-line overflow-hidden bg-surface-2 z-0 cursor-crosshair"
    />
  );
}
