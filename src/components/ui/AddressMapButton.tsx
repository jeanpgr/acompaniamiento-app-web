import { lazy, Suspense, useState } from "react";
import { Map as MapIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { MapPoint } from "@/components/ui/AddressMap";

// Leaflet (~150 KB) solo se descarga cuando alguien abre un mapa.
const AddressMap = lazy(() => import("@/components/ui/AddressMap"));

interface Props {
  points: MapPoint[];
  /** Título del diálogo (p. ej. "Ruta del servicio"). */
  title: string;
  className?: string;
}

/** Botón "Ver en mapa" que abre las direcciones del servicio en un diálogo. */
export default function AddressMapButton({ points, title, className }: Props) {
  const [open, setOpen] = useState(false);
  const withAddress = points.filter((p) => p.address?.trim());
  if (withAddress.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <MapIcon size={14} aria-hidden="true" /> Ver en mapa
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <Suspense
          fallback={
            <div className="h-80 rounded-lg bg-surface-2 animate-pulse" />
          }
        >
          {open && <AddressMap points={withAddress} />}
        </Suspense>
      </Modal>
    </>
  );
}
