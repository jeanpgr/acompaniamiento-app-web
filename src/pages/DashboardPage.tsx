import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarPlus,
  RefreshCw,
  Star,
  UserPlus,
  XCircle,
} from "lucide-react";
import { getDashboard, type DashboardDays } from "@/api/dashboard";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import { getStoredUser } from "@/store/authStore";
import Button from "@/components/ui/Button";
import Panel from "@/components/dashboard/Panel";
import KpiTile, { Delta } from "@/components/dashboard/KpiTile";
import StackedColumns from "@/components/dashboard/StackedColumns";
import AttentionStrip from "@/components/dashboard/AttentionStrip";
import ServicePerformanceTable from "@/components/dashboard/ServicePerformanceTable";
import RatingsPanel from "@/components/dashboard/RatingsPanel";
import TopProducts from "@/components/dashboard/TopProducts";
import {
  KIND_META,
  KIND_ORDER,
  formatInt,
  formatMoney,
  longBucket,
  shortDay,
} from "@/components/dashboard/format";

const RANGES: { days: DashboardDays; label: string }[] = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
];

const dec1 = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

// Ingresos: servicios en el tono de marca, tienda en el acento (validado
// para daltonismo; el naranja lleva tabla y leyenda por su bajo contraste).
const REVENUE_SERIES = [
  { name: "Servicios", color: "var(--color-brand-mark)" },
  { name: "Tienda", color: "var(--color-accent)" },
];
const REQUEST_SERIES = KIND_ORDER.map((k) => ({
  name: KIND_META[k].label,
  color: KIND_META[k].color,
}));

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando métricas">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="skeleton h-36 col-span-2" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-36" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="skeleton h-72" />
        <div className="skeleton h-72" />
      </div>
    </div>
  );
}

/**
 * Dashboard del administrador: lo que requiere acción hoy, los indicadores
 * del periodo comparados con el periodo anterior, la evolución de
 * solicitudes e ingresos, el rendimiento por servicio, la satisfacción y la
 * tienda. Un solo filtro de periodo arriba gobierna todo lo de abajo.
 */
export default function DashboardPage() {
  const [days, setDays] = useState<DashboardDays>(30);
  const query = useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => getDashboard(days),
    // Al cambiar de periodo se conserva lo anterior (atenuado) sin saltos.
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_MS,
  });
  const data = query.data;
  const previousLabel = `los ${days} días anteriores`;
  // Saludo como en el Inicio de la app móvil.
  const firstName = getStoredUser()?.name?.split(" ")[0];

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        {firstName && (
          <p className="text-base text-ink-3 font-medium">Hola, {firstName}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-[15px] text-ink-3 mt-1">
          Pendientes del día y rendimiento de la plataforma
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {data && (
          <span className="text-xs text-ink-3">
            Actualizado{" "}
            {new Date(query.dataUpdatedAt).toLocaleTimeString("es-EC", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <div
          className="segmented"
          role="group"
          aria-label="Periodo"
        >
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

  if (!data) {
    return (
      <div>
        {header}
        {query.isError ? (
          <div className="card p-10 text-center">
            <p className="text-[15px] text-ink-2 mb-4">
              No se pudieron cargar las métricas.
            </p>
            <Button variant="secondary" onClick={() => query.refetch()}>
              <RefreshCw size={16} /> Reintentar
            </Button>
          </div>
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    );
  }

  const { kpis, range } = data;
  const totalRevenue = kpis.serviceRevenue.current + kpis.storeRevenue.current;
  const previousRevenue =
    kpis.serviceRevenue.previous + kpis.storeRevenue.previous;
  const columnLabel = (date: string) => shortDay(date);

  return (
    <div>
      {header}

      {/* Mientras llega el nuevo periodo, lo anterior se atenúa (sin saltos). */}
      <div
        className={`transition-opacity ${query.isPlaceholderData ? "opacity-60" : ""}`}
        aria-busy={query.isPlaceholderData}
      >
        <AttentionStrip attention={data.attention} lowStock={data.lowStock} />

        <h2 className="text-lg font-bold text-ink mb-3">
          Últimos {days} días
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Cifra principal: ingresos del periodo */}
          {/* Tarjeta destacada en navy con etiqueta dorada (hero de la app) */}
          <div className="sm:col-span-2 bg-sidebar text-white rounded-2xl p-6 shadow-hero min-w-0">
            <p className="text-sm font-bold text-gold">Ingresos del periodo</p>
            <p className="text-5xl font-bold mt-2 leading-none">
              {formatMoney(totalRevenue)}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-on-dark">
              <span>
                Servicios{" "}
                <strong className="text-white">
                  {formatMoney(kpis.serviceRevenue.current)}
                </strong>
              </span>
              <span>
                Tienda{" "}
                <strong className="text-white">
                  {formatMoney(kpis.storeRevenue.current)}
                </strong>{" "}
                · {formatInt(kpis.storeOrders.current)}{" "}
                {kpis.storeOrders.current === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
            <div className="[&_p]:text-on-dark [&_.text-ink-3]:text-on-dark [&_.text-success-fg]:text-white [&_.text-danger-fg]:text-white">
              <Delta
                current={totalRevenue}
                previous={previousRevenue}
                periodLabel={previousLabel}
              />
            </div>
          </div>

          <KpiTile
            icon={CalendarPlus}
            label="Solicitudes de servicio"
            value={formatInt(kpis.requests.current)}
            delta={{ ...kpis.requests, periodLabel: previousLabel }}
          />
          <KpiTile
            icon={BadgeCheck}
            label="Confirmación de pago"
            value={
              kpis.confirmationRate.current == null
                ? "—"
                : `${dec1.format(kpis.confirmationRate.current)} %`
            }
            hint="Pagadas sobre las ya resueltas"
            delta={{
              ...kpis.confirmationRate,
              mode: "points",
              periodLabel: previousLabel,
            }}
          />
          <KpiTile
            icon={XCircle}
            label="Cancelaciones"
            value={formatInt(kpis.cancellations.current)}
            delta={{
              ...kpis.cancellations,
              upIsGood: false,
              periodLabel: previousLabel,
            }}
          />
          <KpiTile
            icon={Star}
            label="Calificación promedio"
            value={
              kpis.rating.current == null
                ? "—"
                : `${dec1.format(kpis.rating.current)} / 5`
            }
            hint={`${kpis.rating.count} ${kpis.rating.count === 1 ? "reseña" : "reseñas"}`}
            delta={{
              ...kpis.rating,
              mode: "value",
              periodLabel: previousLabel,
            }}
          />
          <KpiTile
            icon={UserPlus}
            label="Usuarios nuevos"
            value={formatInt(kpis.newUsers.current)}
            delta={{ ...kpis.newUsers, periodLabel: previousLabel }}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
          <Panel
            title="Solicitudes por servicio"
            subtitle={
              range.bucket === "week"
                ? "Nuevas solicitudes por semana"
                : "Nuevas solicitudes por día"
            }
          >
            <StackedColumns
              title="Solicitudes de servicio por fecha y tipo"
              series={REQUEST_SERIES}
              columns={data.timeline.map((p) => ({
                label: columnLabel(p.date),
                longLabel: longBucket(p.date, range.bucket),
                values: KIND_ORDER.map((k) => p.requests[k]),
              }))}
              format={formatInt}
              integer
              emptyText="Sin solicitudes en este periodo"
            />
          </Panel>
          <Panel
            title="Ingresos"
            subtitle="Servicios con pago confirmado y ventas de la tienda (sin canceladas)"
          >
            <StackedColumns
              title="Ingresos por fecha: servicios y tienda"
              series={REVENUE_SERIES}
              columns={data.timeline.map((p) => ({
                label: columnLabel(p.date),
                longLabel: longBucket(p.date, range.bucket),
                values: [p.serviceRevenue, p.storeRevenue],
              }))}
              format={formatMoney}
              emptyText="Sin ingresos en este periodo"
            />
          </Panel>
        </div>

        <Panel
          title="Rendimiento por servicio"
          subtitle="Solicitudes creadas en el periodo y en qué terminaron"
          className="mb-6"
        >
          <ServicePerformanceTable
            rows={data.byService}
            overallRate={kpis.confirmationRate.current}
          />
          <p className="text-xs text-ink-3 mt-3">
            Confirmación de pago = pagadas ÷ (pagadas + canceladas sin pagar +
            no asistidas). Las que aún esperan pago no cuentan. Los ingresos
            excluyen las canceladas (se reembolsan).
          </p>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel
            title="Satisfacción"
            subtitle={`Calificaciones de los últimos ${days} días`}
            className="xl:col-span-2"
          >
            <RatingsPanel
              rating={kpis.rating}
              distribution={data.ratingDistribution}
              recent={data.recentReviews}
            />
          </Panel>
          <Panel
            title="Tienda: más vendidos"
            subtitle="Por unidades en el periodo"
          >
            <TopProducts products={data.topProducts} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
