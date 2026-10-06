import { useState } from "react";
import { Car, Clock, MapPin, User } from "lucide-react";
import type { Vehicle } from "@/api/vehicles";
import AddressMapButton from "@/components/ui/AddressMapButton";
import { formatTime, type Unified } from "./schedules";
import ServiceSections from "./ServiceSections";

interface Props {
  pending: Unified[];
  vehicles: Vehicle[];
  isLoading: boolean;
  /** Hay una asignación en curso (deshabilita la tarjeta abierta). */
  assigning: boolean;
  /** Citas recién asignadas que se animan fuera de la cola. */
  leaving: ReadonlySet<string>;
  onAssign: (s: Unified, vehicleId: string) => void;
}

/**
 * Panel "Sin asignar", agrupado por tipo de servicio en secciones
 * desplegables (ServiceSections) para que la cola no alargue la página.
 */
export default function PendingQueue({
  pending,
  vehicles,
  isLoading,
  assigning,
  leaving,
  onAssign,
}: Props) {
  // Tarjeta con el selector de vehículo abierto.
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const activeVehicles = vehicles.filter((v) => v.active);

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="h-12 px-4 border-b border-line flex items-center gap-2">
        <Clock size={14} className="text-warning-fg" />
        <span className="font-semibold text-ink text-sm">
          Sin asignar ({pending.length})
        </span>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        <ServiceSections
          items={pending}
          idPrefix="pending"
          emptyText="Sin agendamientos pendientes"
          isLoading={isLoading}
          renderItem={(s) => (
            <PendingCard
              s={s}
              vehicles={activeVehicles}
              open={openCardId === s.id}
              busy={assigning && openCardId === s.id}
              leaving={leaving.has(s.id)}
              onOpen={() => setOpenCardId(s.id)}
              onClose={() => setOpenCardId(null)}
              onAssign={(vehicleId) => onAssign(s, vehicleId)}
            />
          )}
        />
      </div>
    </div>
  );
}

interface CardProps {
  s: Unified;
  vehicles: Vehicle[];
  /** Selector de vehículo / confirmación abierto. */
  open: boolean;
  busy: boolean;
  leaving: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAssign: (vehicleId: string) => void;
}

/** Cita pendiente: datos básicos y acción para asignar vehículo o confirmar. */
function PendingCard({
  s,
  vehicles,
  open,
  busy,
  leaving,
  onOpen,
  onClose,
  onAssign,
}: CardProps) {
  return (
    <div
      className={`grid ${leaving ? "leaving-to-calendar" : ""}`}
      aria-hidden={leaving || undefined}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="bg-surface-2 rounded-lg p-3 border border-line">
          <p className="font-semibold text-ink text-sm leading-tight">
            {s.title}
          </p>

          <div className="mt-1.5 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <User size={10} />
              <span className="truncate">{s.personName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-3">
              <Clock size={10} />
              <span>
                {new Date(s.dateTime).toLocaleDateString("es-CO", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
                {" · "}
                {formatTime(s.dateTime)}
              </span>
            </div>
            {s.address && (
              <div className="flex items-center gap-1.5 text-xs text-ink-3">
                <MapPin size={10} />
                <span className="truncate">{s.address}</span>
              </div>
            )}
            {s.mapPoints && (
              <AddressMapButton
                points={s.mapPoints}
                title={s.title}
                className="mt-1"
              />
            )}
          </div>

          {open ? (
            <div className="mt-2.5 space-y-2">
              {s.needsVehicle ? (
                <>
                  <label
                    htmlFor={`vehicle-${s.id}`}
                    className="flex items-center gap-1.5 text-xs text-ink-3 mb-1 font-medium"
                  >
                    <Car size={11} /> Asignar vehículo
                  </label>
                  <select
                    id={`vehicle-${s.id}`}
                    className="field text-xs px-2 py-1.5"
                    defaultValue=""
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.value) onAssign(e.target.value);
                    }}
                  >
                    <option value="" disabled>
                      Seleccionar vehículo…
                    </option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.license_plate}
                        {v.capacity ? ` (${v.capacity} pax)` : ""}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="text-xs text-ink-3 italic">
                  {s.originalType === "training"
                    ? "Capacitación en línea — no requiere vehículo"
                    : "La familia lleva al adulto a la sede — no requiere vehículo"}
                </p>
              )}

              <div className="flex gap-2">
                {!s.needsVehicle && (
                  <button
                    type="button"
                    onClick={() => onAssign("")}
                    disabled={busy}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
                  >
                    {busy
                      ? "Confirmando…"
                      : s.originalType === "training"
                        ? "Confirmar inscripción"
                        : "Confirmar servicio"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg text-xs text-ink-3 hover:bg-line-strong border border-line"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpen}
              className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              Asignar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
