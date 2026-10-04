import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  Clock,
  CheckCircle,
  Calendar,
  MapPin,
  Truck,
} from "lucide-react";
import {
  getSchedulesAcompanPage,
  updateScheduleAcompan,
  type ScheduleStatus,
} from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import CursorPagination from "@/components/ui/CursorPagination";

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  "EN CURSO": "En ruta",
  COMPLETADO: "Completado",
};

const STATUS_VARIANT: Record<
  string,
  "warning" | "info" | "success" | "default"
> = {
  PENDIENTE: "warning",
  "EN CURSO": "info",
  COMPLETADO: "success",
};

export default function AssignStaffPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<ScheduleStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vehicleAssign, setVehicleAssign] = useState<Record<string, string>>(
    {},
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  // Búsqueda y estado se filtran en el servidor (paginación por cursor); los conteos
  // de las tarjetas llegan con la página y cubren todos los agendamientos.
  const status = filterStatus === "all" ? undefined : filterStatus;
  const pager = useCursorPagination(
    ["schedules-acompan", { status, search: debouncedSearch }],
    (cursor) => getSchedulesAcompanPage(cursor, { status, search: debouncedSearch }),
  );
  const { items: schedules, isLoading, counts } = pager;
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });

  const assignMut = useMutation({
    mutationFn: ({ id, vehicle_id }: { id: string; vehicle_id: string }) =>
      updateScheduleAcompan(id, { id_vehicle: vehicle_id, status: "EN CURSO" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules-acompan"] });
      setSelectedId(null);
    },
  });

  const items = schedules.map((s) => ({
    id: s.id,
    title: s.service?.name ?? "Servicio",
    type: s.service?.type ?? "—",
    person: s.reference,
    date: new Date(s.date_time).toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
    }),
    origin: s.origin_address,
    destination: s.destination_address,
    status: s.status ?? "PENDIENTE",
    vehicle: s.vehicle?.name ?? null,
  }));

  const pending = counts?.PENDIENTE ?? 0;
  const inRoute = counts?.["EN CURSO"] ?? 0;
  const completed = counts?.COMPLETADO ?? 0;

  const selected = items.find((i) => i.id === selectedId);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Asignar vehículo</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Asigna vehículos a los servicios pendientes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={Clock}
          tone="warning"
          value={pending}
          label="Pendientes"
        />
        <StatCard icon={Truck} tone="info" value={inRoute} label="En ruta" />
        <StatCard
          icon={CheckCircle}
          tone="success"
          value={completed}
          label="Completados"
        />
        <StatCard
          icon={UserCheck}
          tone="primary"
          value={vehicles.length}
          label="Vehículos activos"
        />
      </div>

      <div className="flex gap-5">
        {/* Left: service list */}
        <div className="flex-1">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por referencia o dirección"
              label="Buscar servicios agendados"
              className="w-60"
            />
            {(["all", "PENDIENTE", "EN CURSO", "COMPLETADO"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === f
                    ? "bg-primary text-white"
                    : "bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2"
                }`}
                aria-pressed={filterStatus === f}
              >
                {f === "all" ? "Todos" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
            {isLoading ? (
              <TableSkeleton label="Cargando servicios…" />
            ) : (
              <table className="w-full min-w-160">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Servicio
                    </th>
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Beneficiario
                    </th>
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Fecha
                    </th>
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Vehículo
                    </th>
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Estado
                    </th>
                    <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-line/70 hover:bg-surface-2 cursor-pointer transition-colors ${
                        selectedId === item.id ? "bg-info-bg/40" : ""
                      }`}
                      onClick={() =>
                        setSelectedId(item.id === selectedId ? null : item.id)
                      }
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink text-sm">
                          {item.title}
                        </p>
                        <p className="text-xs text-ink-3">{item.type}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-2">
                        {item.person}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-sm text-ink-3">
                          <Calendar size={12} />
                          {item.date}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-2">
                        {item.vehicle ?? (
                          <span className="text-ink-3 italic text-xs">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={STATUS_VARIANT[item.status] ?? "default"}
                        >
                          {STATUS_LABEL[item.status] ?? item.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.status === "PENDIENTE" && (
                          <button
                            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(item.id);
                            }}
                          >
                            Asignar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-ink-3 text-sm"
                      >
                        {debouncedSearch
                          ? `Sin resultados para "${debouncedSearch}"`
                          : "No hay servicios en este estado"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
            {!isLoading && <CursorPagination pager={pager} />}
          </div>
        </div>

        {/* Right: assignment panel */}
        {selected && selected.status === "PENDIENTE" && (
          <div className="w-72 shrink-0">
            <div className="bg-surface rounded-xl shadow-sm border border-line p-5">
              <h3 className="font-semibold text-ink mb-4">Asignar vehículo</h3>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-start gap-2 text-ink-2">
                  <MapPin size={14} className="mt-0.5 text-ink-3 shrink-0" />
                  <div>
                    <p className="text-xs text-ink-3">Origen</p>
                    <p>{selected.origin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-ink-2">
                  <MapPin
                    size={14}
                    className="mt-0.5 text-success-fg shrink-0"
                  />
                  <div>
                    <p className="text-xs text-ink-3">Destino</p>
                    <p>{selected.destination}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p
                  id="assign-vehiculo"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Seleccionar vehículo
                </p>
                {vehicles.length === 0 ? (
                  <p className="text-xs text-ink-3 italic">
                    No hay vehículos registrados
                  </p>
                ) : (
                  <div
                    role="radiogroup"
                    aria-labelledby="assign-vehiculo"
                    className="space-y-2"
                  >
                    {vehicles.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          vehicleAssign[selected.id] === v.id
                            ? "border-info bg-info-bg"
                            : "border-line hover:border-line-strong"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`vehicle-${selected.id}`}
                          value={v.id}
                          checked={vehicleAssign[selected.id] === v.id}
                          onChange={() =>
                            setVehicleAssign((p) => ({
                              ...p,
                              [selected.id]: v.id,
                            }))
                          }
                          className="accent-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-ink text-sm">
                            {v.name}
                          </p>
                          <p className="text-xs text-ink-3">
                            {v.license_plate} · {v.capacity ?? "—"} pasajeros
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-40 bg-primary text-white hover:bg-primary-hover transition-colors"
                disabled={!vehicleAssign[selected.id] || assignMut.isPending}
                onClick={() => {
                  if (vehicleAssign[selected.id])
                    assignMut.mutate({
                      id: selected.id,
                      vehicle_id: vehicleAssign[selected.id],
                    });
                }}
              >
                {assignMut.isPending ? "Asignando..." : "Confirmar asignación"}
              </button>

              <button
                className="w-full mt-2 py-2 rounded-lg text-sm text-ink-3 hover:text-ink"
                onClick={() => setSelectedId(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
