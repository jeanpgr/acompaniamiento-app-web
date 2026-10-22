import type { Vehicle } from "@/api/vehicles";

/** "Nombre — PLACA · Conductor" para selectores y paneles de distribución. */
export function vehicleLabel(v: Vehicle) {
  const driver = v.driver
    ? `${v.driver.name} ${v.driver.lastname}`.trim()
    : "Sin conductor";
  return `${v.name} — ${v.license_plate} · ${driver}`;
}

/** Nombre del conductor del vehículo ("Sin conductor" si no tiene). */
export const driverName = (v: Pick<Vehicle, "driver"> | undefined) =>
  v?.driver ? `${v.driver.name} ${v.driver.lastname}`.trim() : "Sin conductor";
