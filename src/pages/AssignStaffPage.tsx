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
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
  CardActions,
} from "@/components/ui/CardGrid";
import CursorPagination from "@/components/ui/CursorPagination";
import AddressMapButton from "@/components/ui/AddressMapButton";
import { invalidateResource, LIVE_REFETCH_MS } from "@/lib/invalidate";

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
    (cursor) =>
      getSchedulesAcompanPage(cursor, { status, search: debouncedSearch }),
    // Las reservas nuevas llegan desde la app sin que el panel haga nada.
    { refetchInterval: LIVE_REFETCH_MS },
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
      invalidateResource(qc, "schedules-acompan");
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
    mapPoints: [
      {
        label: "Origen",
        address: s.origin_address,
        lat: s.origin_lat,
        lng: s.origin_lng,
      },
      {
        label: "Destino",
        address: s.destination_address,
        lat: s.destination_lat,
        lng: s.destination_lng,
      },
    ],
    status: s.status ?? "PENDIENTE",
    vehicle: s.vehicle?.name ?? null,
  }));

  const pending = counts?.PENDIENTE ?? 0;
  const inRoute = counts?.["EN CURSO"] ?? 0;
  const completed = counts?.COMPLETADO ?? 0;

  const selected = items.find((i) => i.id === selectedId);
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay servicios en este estado";

  type Item = (typeof items)[number];
  const toggleSelected = (item: Item) =>
    setSelectedId(item.id === selectedId ? null : item.id);

  const renderStatus = (item: Item) => (
    <Badge variant={STATUS_VARIANT[item.status] ?? "default"}>
      {STATUS_LABEL[item.status] ?? item.status}
    </Badge>
  );

  const renderVehicle = (item: Item) =>
    item.vehicle ?? (
      <span className="text-ink-3 italic text-xs">Sin asignar</span>
    );

  const renderAssign = (item: Item) =>
    item.status === "PENDIENTE" && (
      <button
        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(item.id);
        }}
      >
        Asignar
      </button>
    );

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

      {/* En pantallas angostas el panel de asignación pasa debajo del listado */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: service list */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por referencia o dirección"
              label="Buscar servicios agendados"
              className="w-60"
            />
            {(["all", "PENDIENTE", "EN CURSO", "COMPLETADO"] as const).map(
              (f) => (
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
              ),
            )}
            <div className="ml-auto">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
            {isLoading ? (
              <TableSkeleton label="Cargando servicios…" />
            ) : view === "grid" ? (
              <CardGrid empty={items.length === 0 && emptyText}>
                {items.map((item) => (
                  <GridCard
                    key={item.id}
                    selected={selectedId === item.id}
                    onClick={() => toggleSelected(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-medium text-ink text-sm">
                          {item.title}
                        </h2>
                        <p className="text-xs text-ink-3">{item.type}</p>
                      </div>
                      {renderStatus(item)}
                    </div>
                    <CardFields>
                      <CardField label="Beneficiario">{item.person}</CardField>
                      <CardField label="Fecha">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} className="text-ink-3" />
                          {item.date}
                        </span>
                      </CardField>
                      <CardField label="Vehículo">
                        {renderVehicle(item)}
                      </CardField>
                    </CardFields>
                    {item.status === "PENDIENTE" && (
                      <CardActions>{renderAssign(item)}</CardActions>
                    )}
                  </GridCard>
                ))}
              </CardGrid>
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
                      onClick={() => toggleSelected(item)}
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
                        {renderVehicle(item)}
                      </td>
                      <td className="px-5 py-3.5">{renderStatus(item)}</td>
                      <td className="px-5 py-3.5">{renderAssign(item)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-ink-3 text-sm"
                      >
                        {emptyText}
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
          <div className="w-full lg:w-72 shrink-0">
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
                <AddressMapButton
                  points={selected.mapPoints}
                  title="Ruta del servicio"
                />
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
