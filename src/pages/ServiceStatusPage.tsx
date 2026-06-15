import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Truck,
  CheckCircle,
  Phone,
  User,
  ChevronDown,
} from "lucide-react";
import {
  getSchedulesAcompan,
  updateScheduleAcompan,
  type ScheduleStatus,
} from "@/api/schedules";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";

const STATUS_CONFIG: Record<
  ScheduleStatus,
  {
    label: string;
    variant: "warning" | "info" | "success";
    icon: React.ElementType;
    dot: string;
  }
> = {
  PENDIENTE: {
    label: "Pendiente",
    variant: "warning",
    icon: Clock,
    dot: "#F59E0B",
  },
  "EN CURSO": {
    label: "En ruta",
    variant: "info",
    icon: Truck,
    dot: "#3B82F6",
  },
  COMPLETADO: {
    label: "Completado",
    variant: "success",
    icon: CheckCircle,
    dot: "#22C55E",
  },
};

export default function ServiceStatusPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ScheduleStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules-acompan"],
    queryFn: getSchedulesAcompan,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduleStatus }) =>
      updateScheduleAcompan(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules-acompan"] });
      setUpdatingId(null);
    },
  });

  const items = schedules.map((s) => ({
    id: s.id,
    title: s.service?.name ?? "Servicio",
    type: s.service?.type ?? "—",
    person: s.reference,
    phone: s.contact_emergency,
    origin: s.origin_address,
    destination: s.destination_address,
    status: (s.status ?? "PENDIENTE") as ScheduleStatus,
    vehicle: s.vehicle?.name ?? null,
    date: new Date(s.date_time).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const filtered =
    filter === "all" ? items : items.filter((i) => i.status === filter);
  const counts = {
    PENDIENTE: items.filter((i) => i.status === "PENDIENTE").length,
    "EN CURSO": items.filter((i) => i.status === "EN CURSO").length,
    COMPLETADO: items.filter((i) => i.status === "COMPLETADO").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Estado del servicio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitorea el estado en tiempo real de los servicios activos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard
          icon={Clock}
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          value={counts["PENDIENTE"]}
          label="Pendientes"
        />
        <StatCard
          icon={Truck}
          iconBg="#DBEAFE"
          iconColor="#3B82F6"
          value={counts["EN CURSO"]}
          label="En ruta"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="#D1FAE5"
          iconColor="#22C55E"
          value={counts["COMPLETADO"]}
          label="Completados"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "PENDIENTE", "EN CURSO", "COMPLETADO"] as const).map((f) => {
          const cfg = f !== "all" ? STATUS_CONFIG[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              style={
                filter === f ? { backgroundColor: cfg?.dot ?? "#1D3461" } : {}
              }
            >
              {f === "all" ? "Todos los servicios" : cfg?.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Cargando servicios...
        </div>
      ) : (
        /* Cards grid */
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-4"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {item.title}
                    </p>
                    <span className="inline-block text-xs text-slate-400 mt-0.5">
                      {item.type}
                    </span>
                  </div>
                  <Badge variant={cfg.variant}>
                    <Icon size={10} className="mr-1" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Beneficiary */}
                <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User size={11} /> {item.person}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={11} /> {item.phone}
                  </span>
                </div>

                {/* Route */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-0.5 shrink-0" />
                    <span className="truncate">{item.origin}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-0.5 shrink-0" />
                    <span className="truncate">{item.destination}</span>
                  </div>
                </div>

                {/* Vehicle & date */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="text-xs text-slate-400">
                    {item.vehicle ? (
                      <span className="flex items-center gap-1">
                        <Truck size={10} /> {item.vehicle}
                      </span>
                    ) : (
                      <span className="text-amber-500">Sin vehículo</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{item.date}</span>
                </div>

                {/* Status update — only for non-completed */}
                {item.status !== "COMPLETADO" && (
                  <div className="mt-3">
                    {updatingId === item.id ? (
                      <div className="flex gap-2">
                        {(["EN CURSO", "COMPLETADO"] as ScheduleStatus[])
                          .filter((s) => s !== item.status)
                          .map((s) => (
                            <button
                              key={s}
                              onClick={() =>
                                updateMut.mutate({ id: item.id, status: s })
                              }
                              className="flex-1 py-1 rounded text-xs font-medium border border-slate-200 hover:bg-slate-50 text-slate-600"
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        <button
                          onClick={() => setUpdatingId(null)}
                          className="px-2 py-1 text-xs text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setUpdatingId(item.id)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-slate-600 border border-slate-200 hover:bg-slate-50"
                      >
                        Cambiar estado <ChevronDown size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-slate-400 text-sm">
              No hay servicios en este estado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
