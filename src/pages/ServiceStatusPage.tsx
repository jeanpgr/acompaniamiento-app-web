import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Clock,
  Truck,
  CheckCircle,
  Phone,
  User,
  ChevronDown,
  CalendarX,
  XCircle,
  Landmark,
} from "lucide-react";
import {
  getSchedulesAcompan,
  updateScheduleAcompan,
  markRefundCompleteAcompan,
  type ScheduleStatus,
} from "@/api/schedules";
import Badge from "@/components/ui/Badge";
import AddressMapButton from "@/components/ui/AddressMapButton";
import StatCard from "@/components/ui/StatCard";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";

const STATUS_CONFIG: Record<
  ScheduleStatus,
  {
    label: string;
    variant: "warning" | "info" | "success" | "danger" | "default";
    icon: React.ElementType;
    dot: string;
  }
> = {
  PENDIENTE: {
    label: "Pendiente",
    variant: "warning",
    icon: Clock,
    dot: "bg-warning",
  },
  "EN CURSO": {
    label: "En ruta",
    variant: "info",
    icon: Truck,
    dot: "bg-info",
  },
  COMPLETADO: {
    label: "Completado",
    variant: "success",
    icon: CheckCircle,
    dot: "bg-success",
  },
  OLVIDADA: {
    label: "No asistió",
    variant: "default",
    icon: CalendarX,
    dot: "bg-line-strong",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "danger",
    icon: XCircle,
    dot: "bg-danger",
  },
};

const STATUS_TABS: (ScheduleStatus | "all")[] = [
  "all",
  "PENDIENTE",
  "EN CURSO",
  "COMPLETADO",
  "OLVIDADA",
  "CANCELADA",
];

export default function ServiceStatusPage() {
  const [filter, setFilter] = useState<ScheduleStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules-acompan"],
    queryFn: getSchedulesAcompan,
    // Reservas y cancelaciones llegan desde la app sin que el panel haga nada.
    refetchInterval: LIVE_REFETCH_MS,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduleStatus }) =>
      updateScheduleAcompan(id, { status }),
    meta: {
      invalidates: "schedules-acompan",
      errorMessage: "No se pudo actualizar el estado",
    },
    onSuccess: () => setUpdatingId(null),
  });

  const refundMut = useMutation({
    mutationFn: (id: string) => markRefundCompleteAcompan(id),
    meta: {
      invalidates: "schedules-acompan",
      errorMessage: "No se pudo registrar el reembolso",
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
    status: (s.status ?? "PENDIENTE") as ScheduleStatus,
    vehicle: s.vehicle?.name ?? null,
    refundStatus: s.refund_status,
    refundBank: s.refund_bank_name,
    refundAccount: s.refund_bank_account,
    refundAccountType: s.refund_account_type,
    refundHolderCedula: s.refund_holder_cedula,
    date: new Date(s.date_time).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const filtered =
    filter === "all" ? items : items.filter((i) => i.status === filter);
  const counts: Record<ScheduleStatus, number> = {
    PENDIENTE: items.filter((i) => i.status === "PENDIENTE").length,
    "EN CURSO": items.filter((i) => i.status === "EN CURSO").length,
    COMPLETADO: items.filter((i) => i.status === "COMPLETADO").length,
    OLVIDADA: items.filter((i) => i.status === "OLVIDADA").length,
    CANCELADA: items.filter((i) => i.status === "CANCELADA").length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Estado del servicio
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Monitorea el estado en tiempo real de los servicios activos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-5">
        <StatCard
          icon={Clock}
          tone="warning"
          value={counts["PENDIENTE"]}
          label="Pendientes"
        />
        <StatCard
          icon={Truck}
          tone="info"
          value={counts["EN CURSO"]}
          label="En ruta"
        />
        <StatCard
          icon={CheckCircle}
          tone="success"
          value={counts["COMPLETADO"]}
          label="Completados"
        />
        <StatCard
          icon={CalendarX}
          tone="neutral"
          value={counts["OLVIDADA"]}
          label="No asistió"
        />
        <StatCard
          icon={XCircle}
          tone="danger"
          value={counts["CANCELADA"]}
          label="Canceladas"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((f) => {
          const cfg = f !== "all" ? STATUS_CONFIG[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="chip"
              aria-pressed={filter === f}
            >
              {cfg && (
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${cfg.dot} ${filter === f ? "ring-2 ring-white/80" : ""}`}
                />
              )}
              {f === "all" ? "Todos los servicios" : cfg?.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div
          role="status"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <span className="sr-only">Cargando servicios…</span>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton h-44 rounded-xl"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : (
        /* Cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.status];
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className="card p-5"
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-base line-clamp-2 wrap-break-word">
                      {item.title}
                    </p>
                    <span className="inline-block text-xs text-ink-3 mt-0.5">
                      {item.type}
                    </span>
                  </div>
                  <Badge variant={cfg.variant}>
                    <Icon size={12} className="mr-1" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Beneficiary */}
                <div className="flex items-center gap-4 mb-3 text-xs text-ink-3">
                  <span className="flex items-center gap-1">
                    <User size={13} /> {item.person}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={13} /> {item.phone}
                  </span>
                </div>

                {/* Route */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-start gap-2 text-xs text-ink-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                    <span className="truncate">{item.origin}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-ink-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-success mt-1 shrink-0" />
                    <span className="truncate">{item.destination}</span>
                  </div>
                  <AddressMapButton
                    points={item.mapPoints}
                    title={`Ruta · ${item.title}`}
                    className="mt-1.5"
                  />
                </div>

                {/* Vehicle & date */}
                <div className="flex items-center justify-between pt-3 border-t border-line/70">
                  <div className="text-xs text-ink-3">
                    {item.vehicle ? (
                      <span className="flex items-center gap-1">
                        <Truck size={12} /> {item.vehicle}
                      </span>
                    ) : (
                      <span className="text-warning-fg">Sin vehículo</span>
                    )}
                  </div>
                  <span className="text-xs text-ink-3">{item.date}</span>
                </div>

                {/* Status update — solo para estados que aún pueden avanzar */}
                {item.status !== "COMPLETADO" &&
                  item.status !== "CANCELADA" && (
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
                                className="flex-1 min-h-9 rounded-lg text-[13px] font-semibold border-[1.5px] border-line-strong text-primary hover:bg-primary-soft"
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          <button
                            onClick={() => setUpdatingId(null)}
                            className="w-9 h-9 rounded-full text-sm text-ink-3 hover:bg-surface-2"
                            aria-label="Cancelar cambio de estado"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setUpdatingId(item.id)}
                          className="w-full flex items-center justify-center gap-1 min-h-9 rounded-lg text-[13px] font-semibold text-primary border-[1.5px] border-line-strong hover:bg-primary-soft"
                        >
                          Cambiar estado <ChevronDown size={16} />
                        </button>
                      )}
                    </div>
                  )}

                {/* Reembolso — solo para citas canceladas */}
                {item.status === "CANCELADA" && (
                  <div className="mt-3 pt-3 border-t border-line/70">
                    {(item.refundBank || item.refundAccount) && (
                      <div className="flex items-start gap-1.5 text-xs text-ink-3 mb-2">
                        <Landmark size={13} className="mt-0.5 shrink-0" />
                        <span>
                          {item.refundAccountType ?? "Cuenta"} ·{" "}
                          {item.refundBank ?? "—"} · {item.refundAccount ?? "—"}
                          {item.refundHolderCedula
                            ? ` · CC ${item.refundHolderCedula}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {!item.refundStatus ? (
                      <p className="text-xs text-ink-3">
                        Cancelada antes del pago · sin reembolso
                      </p>
                    ) : item.refundStatus === "REALIZADO" ? (
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-success-fg bg-success-bg rounded-lg py-2 px-2.5">
                        <CheckCircle size={14} /> Reembolso realizado
                      </div>
                    ) : (
                      <button
                        onClick={() => refundMut.mutate(item.id)}
                        disabled={refundMut.isPending}
                        className="w-full flex items-center justify-center gap-1.5 min-h-9 rounded-lg text-[13px] font-semibold disabled:opacity-50 bg-primary text-white shadow-raised hover:bg-primary-hover transition-colors"
                      >
                        {refundMut.isPending && refundMut.variables === item.id
                          ? "Guardando…"
                          : "Marcar reembolso realizado"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-ink-3 text-[15px]">
              No hay servicios en este estado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
