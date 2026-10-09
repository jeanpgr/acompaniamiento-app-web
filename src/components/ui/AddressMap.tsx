import { useEffect, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "lucide-react";
import { searchAddress } from "@/api/geocode";

export interface MapPoint {
  /** Nombre del punto: "Origen", "Destino", "Recogida"… */
  label: string;
  address: string;
  /** Punto exacto elegido en la app; sin él se busca la dirección. */
  lat?: number | null;
  lng?: number | null;
}

type Resolved = MapPoint & {
  letter: string;
  coords: { lat: number; lng: number } | null;
  approximate: boolean;
  loading: boolean;
};

const hasCoords = (p: MapPoint) =>
  typeof p.lat === "number" && typeof p.lng === "number";

// Colores de los marcadores por orden (A, B, C…). Clases literales para que
// Tailwind las genere aunque se usen dentro del HTML del marcador.
const PIN_CLASSES = [
  "bg-primary text-white",
  "bg-success text-white",
  "bg-accent text-white",
];

const pinHtml = (letter: string, i: number) =>
  `<span class="flex items-center justify-center w-7 h-7 rounded-full rounded-br-none rotate-45 shadow-md ring-2 ring-white ${PIN_CLASSES[i % PIN_CLASSES.length]}"><span class="-rotate-45 text-xs font-bold">${letter}</span></span>`;

const googleMapsUrl = (p: Resolved) =>
  p.coords
    ? `https://www.google.com/maps/search/?api=1&query=${p.coords.lat},${p.coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;

/**
 * Mapa (OpenStreetMap + Leaflet, igual que la app) con las direcciones de un
 * servicio. Usa el punto exacto que eligió el usuario en la app; si no lo hay
 * (dirección escrita a mano o cita anterior), busca la dirección y la marca
 * como aproximada.
 */
export default function AddressMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const lookups = useQueries({
    queries: points.map((p) => ({
      queryKey: ["geocode", p.address],
      queryFn: () => searchAddress(p.address),
      enabled: !hasCoords(p) && !!p.address.trim(),
      staleTime: Infinity,
      retry: false,
    })),
  });

  const resolved: Resolved[] = points.map((p, i) => {
    const letter = String.fromCharCode(65 + i);
    if (hasCoords(p)) {
      return {
        ...p,
        letter,
        coords: { lat: p.lat!, lng: p.lng! },
        approximate: false,
        loading: false,
      };
    }
    const first = lookups[i]?.data?.[0];
    return {
      ...p,
      letter,
      coords: first ? { lat: first.lat, lng: first.lng } : null,
      approximate: true,
      loading: !!lookups[i]?.isLoading,
    };
  });

  // Firma estable de lo que hay que dibujar (evita recrear el mapa en cada render).
  const markersKey = JSON.stringify(
    resolved.map((p) => [p.letter, p.coords?.lat, p.coords?.lng]),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const located = resolved.filter((p) => p.coords);
    const map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    located.forEach((p) => {
      const index = resolved.indexOf(p);
      L.marker([p.coords!.lat, p.coords!.lng], {
        icon: L.divIcon({
          className: "",
          html: pinHtml(p.letter, index),
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        }),
        title: `${p.label}: ${p.address}`,
        alt: p.label,
      })
        .bindTooltip(`${p.letter} · ${p.label}`, {
          direction: "top",
          offset: [0, -28],
        })
        .addTo(map);
    });

    const latLngs = located.map((p) => L.latLng(p.coords!.lat, p.coords!.lng));
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#1B5598",
        weight: 3,
        dashArray: "6 6",
      }).addTo(map);
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [40, 40],
        maxZoom: 16,
      });
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 16);
    } else {
      // Sin puntos todavía (buscando o no encontrados): vista de Ecuador.
      map.setView([-1.83, -78.18], 6);
    }
    // El mapa se crea dentro de un diálogo que aún está animándose.
    const resize = window.setTimeout(() => map.invalidateSize(), 250);

    return () => {
      window.clearTimeout(resize);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey]);

  const anyLoading = resolved.some((p) => p.loading);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        role="region"
        aria-label={`Mapa: ${resolved.map((p) => `${p.label}, ${p.address}`).join("; ")}`}
        className="h-80 w-full rounded-lg border border-line overflow-hidden bg-surface-2 z-0"
      />
      {anyLoading && (
        <p className="text-xs text-ink-3" aria-live="polite">
          Buscando direcciones en el mapa…
        </p>
      )}
      <ul className="space-y-2">
        {resolved.map((p, i) => (
          <li key={p.letter} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${PIN_CLASSES[i % PIN_CLASSES.length]}`}
              aria-hidden="true"
            >
              {p.letter}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-3">{p.label}</p>
              <p className="text-ink wrap-break-word">{p.address}</p>
              {!p.loading && (
                <p className="text-xs mt-0.5">
                  {!p.coords ? (
                    <span className="text-danger-fg">
                      No se encontró esta dirección en el mapa
                    </span>
                  ) : p.approximate ? (
                    <span className="text-warning-fg">
                      Ubicación aproximada (buscada por la dirección)
                    </span>
                  ) : (
                    <span className="text-success-fg">
                      Punto exacto elegido en la app
                    </span>
                  )}
                </p>
              )}
            </div>
            <a
              href={googleMapsUrl(p)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-info-fg hover:underline"
            >
              Google Maps <ExternalLink size={13} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
