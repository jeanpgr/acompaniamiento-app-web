import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle,
  ClipboardCheck,
  MapPin,
  Phone,
  RefreshCw,
} from "lucide-react";
import {
  getDriverDashboard,
  type DashboardDays,
  type DriverServiceItem,
} from "@/api/dashboard";
import { getStoredUser } from "@/store/authStore";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import RefreshButton from "@/components/ui/RefreshButton";
import Panel from "./Panel";
import StackedColumns from "./StackedColumns";
import { formatInt, longBucket, shortDay } from "./format";

const RANGES: { days: DashboardDays; label: string }[] = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
];

const SERIES = [
  { name: "Completados", color: "var(--color-brand-mark)" },
  { name: "No asistidos", color: "var(--color-accent)" },
];

const STATUS_BADGE = {
  "EN CURSO": { label: "En ruta", variant: "info" },
  COMPLETADO: { label: "Completado", variant: "success" },
  OLVIDADA: { label: "No asistido", variant: "default" },
} as const;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** Un servicio asignado: cuándo, qué, de dónde a dónde y a quién llamar. */
function ServiceRow({
  s,
  showDay,
}: {
  s: DriverServiceItem;
  showDay?: boolean;
}) {
  const st = STATUS_BADGE[s.status];
  return (
    <li className="rounded-xl bg-surface-2 p-3.5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink tabular-nums">
          {showDay ? `${dayOf(s.dateTime)} · ` : ""}
          {timeOf(s.dateTime)}
        </p>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>
      <p className="mt-1 font-semibold text-ink text-sm wrap-break-word">
        {s.service ?? "Acompañamiento"} · {s.person}
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-3 wrap-break-word">
        <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">
          {s.origin} → {s.destination}
        </span>
      </p>
      {s.phone && (
        <a
          href={`tel:${s.phone}`}
          className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Phone size={13} aria-hidden="true" />
          {s.contactName ? `${s.contactName} · ` : ""}
          {s.phone}
        </a>
      )}
    </li>
  );
}

function ServiceList({
  title,
  subtitle,
  items,
  showDay,
}: {
  title: string;
  subtitle: string;
  items: DriverServiceItem[];
  showDay?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <Link
          to="/acompanamiento"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Ver en Acompañamiento
        </Link>
      }
    >
      <ul className="space-y-2">
        {items.map((s) => (
          <ServiceRow key={s.id} s={s} showDay={showDay} />
        ))}
      </ul>
    </Panel>
  );
}

/**
 * Dashboard del conductor: sus servicios de hoy y de la semana, los que
 * falta marcar y cuántos completó. Sin ingresos, tienda ni datos de otros
 * conductores.
 */
export default function DriverDashboard() {
  const [days, setDays] = useState<DashboardDays>(30);
  const query = useQuery({
    queryKey: ["dashboard", "driver", days],
    queryFn: () => getDriverDashboard(days),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_MS,
  });
  const data = query.data;
  const firstName = getStoredUser()?.name?.split(" ")[0];

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        {firstName && (
          <p className="text-base text-ink-3 font-medium">Hola, {firstName}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-[15px] text-ink-3 mt-1">
          Tus servicios de hoy y de los próximos días
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <RefreshButton />
        <div className="segmented" role="group" aria-label="Periodo">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className="segment"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!data)
    return (
      <div>
        {header}
        {query.isError ? (
          <div className="card p-10 text-center">
            <p className="text-[15px] text-ink-2 mb-4">
              No se pudo cargar tu resumen.
            </p>
            <Button variant="secondary" onClick={() => query.refetch()}>
              <RefreshCw size={16} /> Reintentar
            </Button>
          </div>
        ) : (
          <div aria-busy="true" aria-label="Cargando resumen">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton h-24" />
              ))}
            </div>
            <div className="skeleton h-64" />
          </div>
        )}
      </div>
    );

  const { kpis, range } = data;
  const hasChart = data.timeline.some((p) => p.completed + p.forgotten > 0);
  const hasAnything =
    data.today.length +
      data.upcoming.length +
      data.toClose.length +
      kpis.completed +
      kpis.forgotten >
    0;

  return (
    <div>
      {header}

      <div
        className={`transition-opacity ${query.isPlaceholderData ? "opacity-60" : ""}`}
        aria-busy={query.isPlaceholderData}
      >
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <StatCard
            icon={CalendarCheck}
            tone="info"
            value={formatInt(kpis.today)}
            label="Servicios de hoy"
          />
          <StatCard
            icon={CalendarClock}
            tone="primary"
            value={formatInt(kpis.upcoming)}
            label="Próximos 7 días"
          />
          <StatCard
            icon={ClipboardCheck}
            tone={kpis.toClose > 0 ? "warning" : "neutral"}
            value={formatInt(kpis.toClose)}
            label="Por marcar como completados"
          />
          <StatCard
            icon={CheckCircle}
            tone="success"
            value={formatInt(kpis.completed)}
            label={`Completados · ${days} días`}
          />
          <StatCard
            icon={CalendarX}
            tone="neutral"
            value={formatInt(kpis.forgotten)}
            label={`No asistidos · ${days} días`}
          />
        </div>

        {!hasAnything && (
          <div className="card p-10 text-center text-[15px] text-ink-3">
            Aún no tienes servicios asignados en este periodo.
          </div>
        )}

        <div className="space-y-5">
          <ServiceList
            title="Hoy"
            subtitle="Tus servicios del día"
            items={data.today}
          />
          <ServiceList
            title="Por marcar"
            subtitle="Ya pasó su hora y siguen en ruta: márcalos en Acompañamiento"
            items={data.toClose}
            showDay
          />
          <ServiceList
            title="Próximos"
            subtitle="Lo que tienes en los siguientes 7 días"
            items={data.upcoming}
            showDay
          />
          {hasChart && (
            <Panel
              title="Tu actividad"
              subtitle={
                range.bucket === "week"
                  ? "Servicios por semana"
                  : "Servicios por día"
              }
            >
              <StackedColumns
                title="Servicios completados y no asistidos por fecha"
                series={SERIES}
                columns={data.timeline.map((p) => ({
                  label: shortDay(p.date),
                  longLabel: longBucket(p.date, range.bucket),
                  values: [p.completed, p.forgotten],
                }))}
                format={formatInt}
                integer
                emptyText="Sin servicios en este periodo"
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
