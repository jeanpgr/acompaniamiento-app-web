import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVehicles } from "@/api/vehicles";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import { invalidateResource } from "@/lib/invalidate";
import WeekCalendar from "@/components/distribution/WeekCalendar";
import PendingQueue from "@/components/distribution/PendingQueue";
import RefundsPanel from "@/components/distribution/RefundsPanel";
import ServiceTypeLegend from "@/components/distribution/ServiceTypeLegend";
import { useDistributionSchedules } from "@/components/distribution/useDistributionSchedules";
import {
  FILTER_TABS,
  assignSchedule,
  isPending,
  markRefundComplete,
  type FilterTab,
  type Unified,
} from "@/components/distribution/schedules";

const SERVICE_TYPES = [
  "ACOMPAÑAMIENTO",
  "TURISMO",
  "CAPACITACION",
  "GUARDERIA",
] as const;

export default function DistributionPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  // Citas recién asignadas: se animan fuera de la cola antes de refrescar.
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());

  const { schedules, isLoading } = useDistributionSchedules();
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });

  const filtered =
    activeTab === "todos"
      ? schedules
      : schedules.filter((s) => s.originalType === activeTab);
  const pending = filtered.filter(isPending);
  const cancelled = filtered.filter((s) => s.status === "CANCELADA");

  // Los contadores de pestañas usan el mismo criterio que "Sin asignar".
  const pendingByTab = (key: FilterTab) =>
    schedules.filter(
      (s) => isPending(s) && (key === "todos" || s.originalType === key),
    ).length;

  // ── Asignación ───────────────────────────────────────────────
  // La tarjeta sale de "Sin asignar" (animación leaving-to-calendar) y
  // después se refrescan los datos; así la cola se cierra en lugar de saltar.
  const assignMut = useMutation({
    mutationFn: ({ s, vehicleId }: { s: Unified; vehicleId: string }) =>
      assignSchedule(s, vehicleId),
    meta: { errorMessage: "No se pudo asignar. Intenta de nuevo." },
    onSuccess: (_data, { s }) => {
      setLeaving((prev) => new Set(prev).add(s.id));
      toast.success("Asignado · la cita pasa a En ruta");
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.setTimeout(
        () => {
          invalidateResource(qc, "schedules").finally(() =>
            setLeaving(new Set()),
          );
        },
        reduced ? 200 : 420,
      );
    },
  });

  const handleAssign = (s: Unified, vehicleId: string) => {
    // Capacitación no usa vehículo: se confirma sin él.
    if (s.needsVehicle && !vehicleId) return;
    assignMut.mutate({ s, vehicleId });
  };

  // ── Reembolsos de citas canceladas ───────────────────────────
  const refundMut = useMutation({
    mutationFn: (s: Unified) => markRefundComplete[s.originalType](s.id),
    meta: {
      invalidates: "schedules",
      errorMessage: "No se pudo registrar el reembolso",
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Panel de distribución
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Agendamientos de todos los servicios · Asigna vehículo y confirma
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Pendientes por tipo de servicio */}
          {SERVICE_TYPES.map((t) => {
            const count = schedules.filter(
              (s) => s.serviceType === t && isPending(s),
            ).length;
            if (!count) return null;
            const st = serviceTypeStyle(t);
            return (
              <span
                key={t}
                className={`px-2 py-1 rounded-full font-medium ${st.badge}`}
              >
                {st.label} · {count}
              </span>
            );
          })}
          <Link
            to="servicios"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium bg-surface border border-line text-ink-2 hover:bg-surface-2 hover:border-line-strong transition-colors"
          >
            <List size={14} aria-hidden="true" /> Ver servicios y estados
          </Link>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-line pb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-ink-3 hover:bg-line"
            }`}
          >
            {tab.label}
            <span
              className="ml-1.5 text-xs opacity-70"
              title="Pendientes por asignar"
            >
              ({pendingByTab(tab.key)})
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-start gap-5">
        <WeekCalendar items={filtered} isLoading={isLoading} />

        <div className="w-full xl:w-72 shrink-0 grid items-start gap-3 md:grid-cols-2 xl:block">
          <PendingQueue
            pending={pending}
            vehicles={vehicles}
            isLoading={isLoading}
            assigning={assignMut.isPending}
            leaving={leaving}
            onAssign={handleAssign}
          />
          <RefundsPanel
            cancelled={cancelled}
            savingId={
              refundMut.isPending ? (refundMut.variables?.id ?? null) : null
            }
            onMarkRefunded={(s) => refundMut.mutate(s)}
          />
          <ServiceTypeLegend />
        </div>
      </div>
    </div>
  );
}
