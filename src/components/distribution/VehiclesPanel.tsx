import { Car, User } from "lucide-react";
import type { Vehicle } from "@/api/vehicles";
import type { Unified } from "./schedules";
import { driverName } from "./vehicleLabel";

interface Props {
  vehicles: Vehicle[];
  schedules: Unified[];
  /** Servicios marcados en "Sin asignar" que se asignarían de una vez. */
  selectedCount: number;
  busy: boolean;
  onAssignSelected: (vehicleId: string) => void;
}

// Servicios que el vehículo tiene por hacer o en ruta.
const isActiveFor = (s: Unified, vehicleId: string) =>
  s.vehicleId === vehicleId &&
  (s.status === "PAGADO" || s.status === "EN CURSO");

/**
 * Vehículos activos con su conductor y los servicios que ya tienen, para
 * repartir la cola "Sin asignar": se marcan servicios y se asignan todos al
 * vehículo elegido.
 */
export default function VehiclesPanel({
  vehicles,
  schedules,
  selectedCount,
  busy,
  onAssignSelected,
}: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="h-14 px-5 border-b border-line flex items-center gap-2.5">
        <Car size={16} className="text-primary" />
        <span className="font-bold text-ink text-base">
          Vehículos ({vehicles.length})
        </span>
      </div>
      <div className="p-3 space-y-2.5 max-h-[50vh] overflow-y-auto">
        {selectedCount > 0 && (
          <p className="text-xs font-semibold text-primary bg-primary-soft rounded-lg px-3 py-2">
            {selectedCount}{" "}
            {selectedCount === 1 ? "servicio marcado" : "servicios marcados"}{" "}
            en "Sin asignar". Elige el vehículo.
          </p>
        )}
        {vehicles.length === 0 && (
          <p className="text-sm text-ink-3 text-center py-4">
            No hay vehículos activos
          </p>
        )}
        {vehicles.map((v) => {
          const count = schedules.filter((s) => isActiveFor(s, v.id)).length;
          return (
            <div key={v.id} className="bg-surface rounded-xl p-3.5 shadow-card">
              <p className="font-semibold text-ink text-sm leading-tight">
                {v.name} · {v.license_plate}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                <User size={12} aria-hidden="true" />
                <span className="truncate">{driverName(v)}</span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                {v.capacity ? `${v.capacity} pax · ` : ""}
                {count === 0
                  ? "Sin servicios por hacer"
                  : `${count} ${count === 1 ? "servicio por hacer" : "servicios por hacer"}`}
              </p>
              <button
                type="button"
                disabled={selectedCount === 0 || busy}
                onClick={() => onAssignSelected(v.id)}
                className="mt-2.5 w-full min-h-9 rounded-lg text-[13px] font-semibold bg-primary text-white shadow-raised hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy
                  ? "Asignando…"
                  : selectedCount > 0
                    ? `Asignar ${selectedCount} aquí`
                    : "Marca servicios para asignar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
