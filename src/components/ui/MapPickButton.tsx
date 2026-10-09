import { lazy, Suspense, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { reverseGeocode, searchAddress } from "@/api/geocode";
import type { LatLng } from "@/components/ui/LocationPicker";

// Leaflet (~150 KB) solo se descarga cuando alguien abre el mapa.
const LocationPicker = lazy(() => import("@/components/ui/LocationPicker"));

export interface PickedLocation extends LatLng {
  address: string;
}

interface Props {
  /** Dirección escrita en el campo (para ubicar el mapa al abrir). */
  address: string;
  /** Punto ya guardado, si lo hay. */
  lat?: number | null;
  lng?: number | null;
  /** Título del diálogo, p. ej. "Punto de encuentro". */
  title: string;
  onPick: (location: PickedLocation) => void;
  disabled?: boolean;
}

/**
 * Botón "Elegir en el mapa" junto a un campo de dirección. Abre un mapa
 * donde se busca la dirección o se marca el punto; al confirmar devuelve la
 * dirección resumida y sus coordenadas (la app móvil abre su mapa en ese
 * punto exacto).
 */
export default function MapPickButton({
  address,
  lat,
  lng,
  title,
  onPick,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  // Cada apertura empieza con el estado del campo, no con el de la anterior.
  const [dialogKey, setDialogKey] = useState(0);

  return (
    <>
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() => {
          setDialogKey((k) => k + 1);
          setOpen(true);
        }}
        aria-label={`Elegir ${title.toLowerCase()} en el mapa`}
        className="shrink-0"
      >
        <MapPin size={16} aria-hidden="true" /> Mapa
      </Button>
      <PickerDialog
        key={dialogKey}
        open={open}
        title={title}
        initialAddress={address}
        initialPoint={
          typeof lat === "number" && typeof lng === "number"
            ? { lat, lng }
            : null
        }
        onClose={() => setOpen(false)}
        onConfirm={(loc) => {
          onPick(loc);
          setOpen(false);
        }}
      />
    </>
  );
}

function PickerDialog({
  open,
  title,
  initialAddress,
  initialPoint,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  initialAddress: string;
  initialPoint: LatLng | null;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
}) {
  const [point, setPoint] = useState<LatLng | null>(initialPoint);
  const [address, setAddress] = useState(initialAddress);
  const [query, setQuery] = useState(initialAddress);
  const [submittedQuery, setSubmittedQuery] = useState("");

  // Sin punto guardado pero con dirección escrita: ubicarla al abrir.
  const initialLookup = useQuery({
    queryKey: ["geocode", initialAddress],
    queryFn: () => searchAddress(initialAddress),
    enabled: open && !initialPoint && !!initialAddress.trim(),
    staleTime: Infinity,
    retry: false,
  });
  const located = initialLookup.data?.[0];
  // El punto encontrado se usa mientras el usuario no marque otro.
  const shownPoint =
    point ?? (located ? { lat: located.lat, lng: located.lng } : null);

  const search = useQuery({
    queryKey: ["geocode", submittedQuery],
    queryFn: () => searchAddress(submittedQuery),
    enabled: !!submittedQuery,
    staleTime: Infinity,
    retry: false,
  });

  // Tocar el mapa o arrastrar el pin → buscar la dirección de ese punto.
  const reverse = useMutation({
    mutationFn: (p: LatLng) => reverseGeocode(p.lat, p.lng),
    onSuccess: (res) => {
      if (res?.address) setAddress(res.address);
    },
  });

  const pickOnMap = (p: LatLng) => {
    setPoint(p);
    reverse.mutate(p);
  };

  const canConfirm = !!shownPoint && !!address.trim() && !reverse.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${title} en el mapa`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!canConfirm}
            onClick={() =>
              shownPoint &&
              onConfirm({
                address: address.trim(),
                lat: shownPoint.lat,
                lng: shownPoint.lng,
              })
            }
          >
            Usar esta ubicación
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedQuery(query.trim());
          }}
        >
          <label htmlFor="map-pick-search" className="sr-only">
            Buscar una dirección
          </label>
          <input
            id="map-pick-search"
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección, barrio o lugar"
          />
          <Button type="submit" variant="secondary" disabled={!query.trim()}>
            <Search size={16} aria-hidden="true" /> Buscar
          </Button>
        </form>

        {submittedQuery && (
          <div aria-live="polite">
            {search.isLoading ? (
              <p className="text-xs text-ink-3">Buscando…</p>
            ) : search.data?.length ? (
              <ul className="max-h-36 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                {search.data.slice(0, 5).map((r) => (
                  <li key={`${r.lat},${r.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setPoint({ lat: r.lat, lng: r.lng });
                        setAddress(r.address);
                        setSubmittedQuery("");
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-2"
                    >
                      {r.address}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-danger-fg">
                No se encontró esa dirección. Prueba con otra o marca el punto
                en el mapa.
              </p>
            )}
          </div>
        )}

        <Suspense
          fallback={
            <div className="h-80 rounded-lg bg-surface-2 animate-pulse" />
          }
        >
          <LocationPicker point={shownPoint} onPick={pickOnMap} />
        </Suspense>

        <div className="rounded-lg bg-surface-2 px-3 py-2" aria-live="polite">
          <p className="text-xs text-ink-3">Dirección que se guardará</p>
          {reverse.isPending ? (
            <p className="text-sm text-ink-3">
              Buscando la dirección del punto…
            </p>
          ) : (
            <input
              aria-label="Dirección que se guardará"
              className="w-full bg-transparent text-sm text-ink focus:outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Toca el mapa o busca una dirección"
              maxLength={255}
            />
          )}
          {!shownPoint && (
            <p className="text-xs text-ink-3 mt-1">
              Toca el mapa para marcar el punto; puedes arrastrar el pin para
              ajustarlo.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
