import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleStatus } from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Badge from "@/components/ui/Badge";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import TableSkeleton from "@/components/ui/TableSkeleton";
import CursorPagination from "@/components/ui/CursorPagination";
import AddressMapButton from "@/components/ui/AddressMapButton";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
} from "@/components/ui/CardGrid";
import {
  TableHead,
  TableRow,
  EmptyRow,
  EmptyCell,
} from "@/components/ui/DataTable";
import { useViewMode } from "@/hooks/useViewMode";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useDistributionSchedules } from "@/components/distribution/useDistributionSchedules";
import {
  FILTER_TABS,
  STATUS_LABEL,
  STATUS_VARIANT,
  statusLabelOf,
  formatTime,
  type FilterTab,
  type Unified,
} from "@/components/distribution/schedules";

type StatusFilter = ScheduleStatus | "all";
const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "PENDIENTE",
  "EN CURSO",
  "COMPLETADO",
  "OLVIDADA",
  "CANCELADA",
];

const COLUMNS = [
  "Servicio",
  "Persona",
  "Fecha",
  "Estado",
  "Vehículo",
  "Ubicación",
  "Reembolso",
];

const PAGE_SIZE = 20;

// Sin estado = pendiente (mismo criterio que la cola "Sin asignar").
const statusOf = (s: Unified): ScheduleStatus => s.status ?? "PENDIENTE";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });


function StatusBadge({ s }: { s: Unified }) {
  const status = statusOf(s);
  return <Badge variant={STATUS_VARIANT[status]}>{statusLabelOf(s)}</Badge>;
}

function RefundBadge({ s }: { s: Unified }) {
  if (s.status !== "CANCELADA") return <EmptyCell />;
  // Cancelada antes de confirmar el pago: no hubo cobro.
  if (!s.refundStatus) return <Badge>Sin cobro</Badge>;
  return s.refundStatus === "REALIZADO" ? (
    <Badge variant="success">Realizado</Badge>
  ) : (
    <Badge variant="warning">Por hacer</Badge>
  );
}

function ServiceCell({ s }: { s: Unified }) {
  const st = serviceTypeStyle(s.serviceType);
  return (
    <div className="min-w-0">
      <span
        className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-semibold mb-1 ${st.badge}`}
      >
        {st.label}
      </span>
      <p className="font-semibold text-ink text-sm line-clamp-2 wrap-break-word">
        {s.title}
      </p>
    </div>
  );
}

/**
 * Página hija de Distribución: todas las citas con su estado en una tabla
 * (o tarjetas), filtrables por servicio, estado y texto, sin el calendario.
 */
export default function DistributionServicesPage() {
  const [tab, setTab] = useState<FilterTab>("todos");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  // El filtrado es local: se difiere para que escribir no se sienta lento.
  const query = useDeferredValue(search.trim().toLowerCase());
  const [view, setView] = useViewMode("2xl");

  const { schedules, isLoading } = useDistributionSchedules();
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });
  const vehicleName = new Map(
    vehicles.map((v) => [v.id, `${v.name} · ${v.license_plate}`]),
  );

  const byType =
    tab === "todos"
      ? schedules
      : schedules.filter((s) => s.originalType === tab);
  const countByStatus = (f: StatusFilter) =>
    f === "all"
      ? byType.length
      : byType.filter((s) => statusOf(s) === f).length;

  // Lo más reciente (o próximo) primero.
  const filtered = byType
    .filter((s) => status === "all" || statusOf(s) === status)
    .filter(
      (s) =>
        !query ||
        [s.title, s.personName, s.address]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(query)),
    )
    .reverse();

  const pager = useClientPagination(
    filtered,
    JSON.stringify([tab, status, query]),
    PAGE_SIZE,
  );

  const vehicleCell = (s: Unified) =>
    !s.needsVehicle ? (
      <span className="text-xs text-ink-3">No aplica</span>
    ) : s.vehicleId ? (
      (vehicleName.get(s.vehicleId) ?? "Vehículo asignado")
    ) : (
      <span className="text-xs text-ink-3">Sin asignar</span>
    );

  const locationCell = (s: Unified) =>
    s.mapPoints ? (
      <AddressMapButton points={s.mapPoints} title={s.title} />
    ) : (
      <EmptyCell />
    );

  const emptyText = query
    ? `Sin resultados para "${search.trim()}"`
    : "No hay servicios con estos filtros";

  return (
    <div>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Distribución", to: "/distribution" },
            { label: "Servicios y estados" },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Servicios y estados</h1>
        <p className="text-[15px] text-ink-3 mt-1">
          Todas las citas agendadas con su estado, vehículo y reembolso
        </p>
      </div>

      {/* Tipo de servicio */}
      <div className="flex flex-wrap gap-2 mb-3 border-b border-line pb-3">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className="chip"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por servicio, persona o dirección"
          label="Buscar servicios"
          className="w-full sm:w-80"
        />
        {/* Estado */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatus(f)}
              aria-pressed={status === f}
              className="chip"
            >
              {/* EN CURSO mezcla servicios: "En ruta" (acompañamiento) y
                  "Confirmada" (el resto). */}
              {f === "all"
                ? "Todos"
                : f === "EN CURSO"
                  ? "En ruta / Confirmada"
                  : STATUS_LABEL[f]}{" "}
              <span className="tabular-nums opacity-70">
                ({countByStatus(f)})
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando servicios…" />
        ) : view === "grid" ? (
          <CardGrid empty={pager.items.length === 0 && emptyText}>
            {pager.items.map((s) => (
              <GridCard key={`${s.originalType}-${s.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <ServiceCell s={s} />
                  <StatusBadge s={s} />
                </div>
                <CardFields>
                  <CardField label="Persona">{s.personName}</CardField>
                  <CardField label="Fecha">
                    {formatDate(s.dateTime)} · {formatTime(s.dateTime)}
                  </CardField>
                  <CardField label="Vehículo">{vehicleCell(s)}</CardField>
                  {s.status === "CANCELADA" && (
                    <CardField label="Reembolso">
                      <RefundBadge s={s} />
                    </CardField>
                  )}
                </CardFields>
                {s.mapPoints && locationCell(s)}
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-200">
            <TableHead columns={COLUMNS} />
            <tbody>
              {pager.items.map((s) => (
                <TableRow key={`${s.originalType}-${s.id}`}>
                  <td className="px-4 py-3 max-w-56">
                    <ServiceCell s={s} />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2 max-w-48 truncate">
                    {s.personName}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2 whitespace-nowrap">
                    <div>{formatDate(s.dateTime)}</div>
                    <div className="text-xs text-ink-3 tabular-nums">
                      {formatTime(s.dateTime)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge s={s} />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2">
                    {vehicleCell(s)}
                  </td>
                  <td className="px-4 py-3">{locationCell(s)}</td>
                  <td className="px-4 py-3">
                    <RefundBadge s={s} />
                  </td>
                </TableRow>
              ))}
              {pager.items.length === 0 && (
                <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
              )}
            </tbody>
          </table>
        )}
        {!isLoading && <CursorPagination pager={pager} pageSize={PAGE_SIZE} />}
      </div>
    </div>
  );
}
