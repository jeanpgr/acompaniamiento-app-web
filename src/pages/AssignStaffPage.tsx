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
import { getSchedulesAcompan, updateScheduleAcompan } from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";

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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [vehicleAssign, setVehicleAssign] = useState<Record<string, string>>(
    {},
  );

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules-acompan"],
    queryFn: getSchedulesAcompan,
  });
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

  const filtered = items.filter(
    (i) => filterStatus === "all" || i.status === filterStatus,
  );
  const pending = items.filter((i) => i.status === "PENDIENTE").length;
  const inRoute = items.filter((i) => i.status === "EN CURSO").length;
  const completed = items.filter((i) => i.status === "COMPLETADO").length;

  const selected = items.find((i) => i.id === selectedId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Asignar vehículo
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Asigna vehículos a los servicios pendientes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={Clock}
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          value={pending}
          label="Pendientes"
        />
        <StatCard
          icon={Truck}
          iconBg="#DBEAFE"
          iconColor="#3B82F6"
          value={inRoute}
          label="En ruta"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="#D1FAE5"
          iconColor="#22C55E"
          value={completed}
          label="Completados"
        />
        <StatCard
          icon={UserCheck}
          iconBg="#F3E8FF"
          iconColor="#8B5CF6"
          value={vehicles.length}
          label="Vehículos activos"
        />
      </div>

      <div className="flex gap-5">
        {/* Left: service list */}
        <div className="flex-1">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-3">
            {["all", "PENDIENTE", "EN CURSO", "COMPLETADO"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === f
                    ? "text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={filterStatus === f ? { backgroundColor: "#1D3461" } : {}}
              >
                {f === "all" ? "Todos" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Cargando servicios...
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Servicio
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Beneficiario
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Fecha
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Vehículo
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Estado
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                        selectedId === item.id ? "bg-blue-50/40" : ""
                      }`}
                      onClick={() =>
                        setSelectedId(item.id === selectedId ? null : item.id)
                      }
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 text-sm">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400">{item.type}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {item.person}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar size={12} />
                          {item.date}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {item.vehicle ?? (
                          <span className="text-slate-300 italic text-xs">
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
                            className="text-xs text-white px-3 py-1.5 rounded-lg font-medium"
                            style={{ backgroundColor: "#1D3461" }}
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
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-slate-400 text-sm"
                      >
                        No hay servicios en este estado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: assignment panel */}
        {selected && selected.status === "PENDIENTE" && (
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-700 mb-4">
                Asignar vehículo
              </h3>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin
                    size={14}
                    className="mt-0.5 text-slate-400 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-400">Origen</p>
                    <p>{selected.origin}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin
                    size={14}
                    className="mt-0.5 text-green-500 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-400">Destino</p>
                    <p>{selected.destination}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Seleccionar vehículo
                </label>
                {vehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No hay vehículos registrados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          vehicleAssign[selected.id] === v.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
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
                          className="accent-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 text-sm">
                            {v.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {v.license_plate} · {v.capacity ?? "—"} pasajeros
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="w-full py-2 rounded-lg text-sm text-white font-medium disabled:opacity-40"
                style={{ backgroundColor: "#1D3461" }}
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
                className="w-full mt-2 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700"
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
