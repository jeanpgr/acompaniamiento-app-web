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

// Color de cada pestaña: el del tipo de servicio (mismo que el calendario).
const TAB_SERVICE_TYPE: Record<Exclude<FilterTab, "todos">, string> = {
  acompan: "ACOMPAÑAMIENTO",
  tourism: "TURISMO",
  training: "CAPACITACION",
  daycare: "GUARDERIA",
};

function tabClass(key: FilterTab, selected: boolean) {
  const color =
    key === "todos"
      ? selected
        ? "bg-primary text-white"
        : "bg-surface-2 text-ink-2 hover:bg-line"
      : `${serviceTypeStyle(TAB_SERVICE_TYPE[key]).badge} hover:brightness-95`;
  // La pestaña activa se marca con un anillo de su propio color.
  const active =
    selected && key !== "todos"
      ? "ring-2 ring-current ring-offset-1 ring-offset-surface"
      : "";
  return `inline-flex items-center gap-1.5 min-h-9 px-3.5 rounded-full text-sm font-semibold transition-[filter,background-color] ${color} ${active}`;
}

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
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Panel de distribución
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Agendamientos de todos los servicios · Asigna vehículo y confirma
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="servicios"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-surface border-[1.5px] border-line-strong text-primary hover:bg-primary-soft hover:border-primary/40 transition-colors"
          >
            <List size={16} aria-hidden="true" /> Ver servicios y estados
          </Link>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 mb-4 border-b border-line pb-3"
        role="group"
        aria-label="Filtrar por tipo de servicio"
      >
        {FILTER_TABS.map((tab) => {
          const count = pendingByTab(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              aria-label={`${tab.label}: ${count} por asignar`}
              className={tabClass(tab.key, activeTab === tab.key)}
            >
              {tab.label}
              <span
                className="text-xs opacity-80"
                title="Pendientes por asignar"
              >
                · {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-start gap-5">
        {/* Calendario con la leyenda de colores al pie */}
        <div className="flex-1 min-w-0">
          <WeekCalendar items={filtered} isLoading={isLoading} />
          <ServiceTypeLegend />
        </div>

        {/* Paneles por estado: el espacio entre ellos lo pone la grilla, así
            quedan alineados lado a lado (md) o apilados (xl). */}
        <div className="w-full xl:w-72 shrink-0 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-1">
          <PendingQueue
            pending={pending}
            vehicles={vehicles.filter((v) => v.active)}
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
        </div>
      </div>
    </div>
  );
}
