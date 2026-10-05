import { useState } from "react";
import { Car, Clock, MapPin, User } from "lucide-react";
import type { Vehicle } from "@/api/vehicles";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import AddressMapButton from "@/components/ui/AddressMapButton";
import { formatTime, type Unified } from "./schedules";

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

/** Panel "Sin asignar": cada cita se abre para elegir vehículo o confirmar. */
export default function PendingQueue({
  pending,
  vehicles,
  isLoading,
  assigning,
  leaving,
  onAssign,
}: Props) {
  // Tarjeta con el selector abierto (estado de esta cola, no de la página).
  const [openId, setOpenId] = useState<string | null>(null);
  const activeVehicles = vehicles.filter((v) => v.active);

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2">
        <Clock size={14} className="text-warning-fg" />
        <span className="font-semibold text-ink text-sm">
          Sin asignar ({pending.length})
        </span>
      </div>

      <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        {pending.length === 0 && !isLoading && (
          <p className="text-xs text-ink-3 text-center py-6">
            Sin agendamientos pendientes
          </p>
        )}

        {pending.map((s) => {
          const st = serviceTypeStyle(s.serviceType);
          const isOpen = openId === s.id;
          const busy = assigning && isOpen;
          const isLeaving = leaving.has(s.id);

          return (
            <div
              key={`${s.originalType}-${s.id}`}
              className={`grid ${isLeaving ? "leaving-to-calendar" : ""}`}
              aria-hidden={isLeaving || undefined}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="bg-surface-2 rounded-lg p-3 border border-line">
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${st.badge}`}
                  >
                    {st.label}
                  </span>
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

                  {isOpen ? (
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
                              if (e.target.value) onAssign(s, e.target.value);
                            }}
                          >
                            <option value="" disabled>
                              Seleccionar vehículo…
                            </option>
                            {activeVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} — {v.license_plate}
                                {v.capacity ? ` (${v.capacity} pax)` : ""}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <p className="text-xs text-ink-3 italic">
                          Capacitación en línea — no requiere vehículo
                        </p>
                      )}

                      <div className="flex gap-2">
                        {!s.needsVehicle && (
                          <button
                            type="button"
                            onClick={() => onAssign(s, "")}
                            disabled={busy}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
                          >
                            {busy ? "Confirmando…" : "Confirmar inscripción"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-ink-3 hover:bg-line-strong border border-line"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenId(s.id)}
                      className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                    >
                      Asignar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
