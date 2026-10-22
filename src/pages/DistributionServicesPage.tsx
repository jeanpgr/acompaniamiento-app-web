import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { ScheduleStatus } from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Badge from "@/components/ui/Badge";
import CouponTag from "@/components/ui/CouponTag";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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
import { useScheduleActions } from "@/components/distribution/useScheduleActions";
import { vehicleLabel, driverName } from "@/components/distribution/vehicleLabel";
import {
  FILTER_TABS,
  STATUS_LABEL,
  STATUS_VARIANT,
  statusLabelOf,
  awaitingPayment,
  isPending,
  formatTime,
  type FilterTab,
  type Unified,
} from "@/components/distribution/schedules";

type StatusFilter = ScheduleStatus | "all";
const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "PENDIENTE",
  "PAGADO",
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
  "Acciones",
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

function RefundBadge({
  s,
  onView,
}: {
  s: Unified;
  onView: (s: Unified) => void;
}) {
  if (s.status !== "CANCELADA") return <EmptyCell />;
  // Cancelada antes de confirmar el pago: no hubo cobro.
  if (!s.refundStatus) return <Badge>Sin cobro</Badge>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {s.refundStatus === "REALIZADO" ? (
        <Badge variant="success">Realizado</Badge>
      ) : (
        <Badge variant="warning">Por hacer</Badge>
      )}
      <button
        type="button"
        onClick={() => onView(s)}
        className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
      >
        {s.refundAccount ? "Ver cuenta" : "Sin cuenta"}
      </button>
    </div>
  );
}

/** Copia un dato de la cuenta de reembolso al portapapeles. */
async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiado`);
  } catch {
    toast.error("No se pudo copiar");
  }
}

/** Cuenta que el usuario ingresó al cancelar, para hacer el reembolso. */
function RefundDetailsModal({
  s,
  onClose,
}: {
  s: Unified | null;
  onClose: () => void;
}) {
  const rows: [string, string | null | undefined][] = s
    ? [
        ["Banco", s.refundBank],
        ["Tipo de cuenta", s.refundAccountType],
        ["Número de cuenta", s.refundAccount],
        ["Cédula del titular", s.refundHolderCedula],
      ]
    : [];
  return (
    <Modal
      open={s !== null}
      onClose={onClose}
      title="Datos de reembolso"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {s && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">
            {s.title} · {s.personName}
          </p>
          {s.refundAccount ? (
            <dl className="space-y-2">
              {rows
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 bg-surface-2 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-3">{label}</dt>
                      <dd className="text-sm font-semibold text-ink break-all">
                        {value}
                      </dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(value!, label)}
                      aria-label={`Copiar ${label}`}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-primary hover:bg-primary-soft"
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
            </dl>
          ) : (
            <p className="text-sm text-ink-3">
              El usuario canceló sin ingresar los datos de su cuenta. Pídele
              los datos por WhatsApp.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ServiceCell({ s }: { s: Unified }) {
  return (
    <p className="min-w-0 font-semibold text-ink text-sm line-clamp-2 wrap-break-word">
      {s.title}
    </p>
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
  const actions = useScheduleActions(vehicles);
  const activeVehicles = vehicles.filter((v) => v.active);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  // Cuenta de reembolso abierta en el modal.
  const [refundView, setRefundView] = useState<Unified | null>(null);

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
      vehicleById.get(s.vehicleId) ? (
        <div>
          <div>
            {vehicleById.get(s.vehicleId)!.name} ·{" "}
            {vehicleById.get(s.vehicleId)!.license_plate}
          </div>
          <div className="text-xs text-ink-3">
            {driverName(vehicleById.get(s.vehicleId))}
          </div>
        </div>
      ) : (
        "Vehículo asignado"
      )
    ) : (
      <span className="text-xs text-ink-3">Sin asignar</span>
    );

  const locationCell = (s: Unified) =>
    s.mapPoints ? (
      <AddressMapButton points={s.mapPoints} title={s.title} />
    ) : (
      <EmptyCell />
    );

  /**
   * Lo que el equipo puede resolver desde aquí: confirmar el pago y asignar
   * vehículo (citas sin asignar) o marcar el reembolso (canceladas).
   */
  const actionsCell = (s: Unified) => {
    if (isPending(s) || awaitingPayment(s)) {
      const busy = actions.assigningId === s.id;
      const payButton = awaitingPayment(s) && (
        <Button
          size="sm"
          loading={actions.payingId === s.id}
          onClick={() => actions.confirmPayment(s)}
        >
          Confirmar pago
        </Button>
      );
      const picker = isPending(s) && (
        <select
          aria-label={`Asignar vehículo a ${s.title}`}
          className="field min-h-9 w-48 max-w-full px-2.5 py-1.5 text-sm"
          value=""
          disabled={busy}
          onChange={(e) => actions.assign(s, e.target.value)}
        >
          <option value="" disabled>
            {busy ? "Asignando…" : "Asignar vehículo…"}
          </option>
          {activeVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {vehicleLabel(v)}
            </option>
          ))}
        </select>
      );
      return (
        <div className="flex flex-wrap items-center gap-2">
          {picker}
          {payButton}
        </div>
      );
    }
    if (s.status === "CANCELADA" && s.refundStatus === "EN_PROCESO")
      return (
        <Button
          size="sm"
          loading={actions.refundingId === s.id}
          onClick={() => actions.markRefunded(s)}
        >
          Reembolso realizado
        </Button>
      );
    return <EmptyCell />;
  };

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
        <h1 className="text-xl sm:text-2xl font-bold text-ink">
          Servicios y estados
        </h1>
        <p className="text-[15px] text-ink-3 mt-1">
          Todas las citas agendadas con su estado, vehículo y reembolso ·
          Confirma pagos, asigna vehículos y marca reembolsos
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
              {f === "all" ? "Todos" : STATUS_LABEL[f]}{" "}
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
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge s={s} />
                    <CouponTag code={s.couponCode} discount={s.discountAmount} />
                  </div>
                </div>
                <CardFields>
                  <CardField label="Persona">{s.personName}</CardField>
                  <CardField label="Fecha">
                    {formatDate(s.dateTime)} · {formatTime(s.dateTime)}
                  </CardField>
                  <CardField label="Vehículo">{vehicleCell(s)}</CardField>
                  {s.status === "CANCELADA" && (
                    <CardField label="Reembolso">
                      <RefundBadge s={s} onView={setRefundView} />
                    </CardField>
                  )}
                </CardFields>
                {s.mapPoints && locationCell(s)}
                {(isPending(s) ||
                  awaitingPayment(s) ||
                  s.refundStatus === "EN_PROCESO") && (
                  <div className="mt-3">{actionsCell(s)}</div>
                )}
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-250">
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
                    <div className="flex flex-col items-start gap-1">
                    <StatusBadge s={s} />
                    <CouponTag code={s.couponCode} discount={s.discountAmount} />
                  </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-2">
                    {vehicleCell(s)}
                  </td>
                  <td className="px-4 py-3">{locationCell(s)}</td>
                  <td className="px-4 py-3">
                    <RefundBadge s={s} onView={setRefundView} />
                  </td>
                  <td className="px-4 py-3">{actionsCell(s)}</td>
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

      <RefundDetailsModal s={refundView} onClose={() => setRefundView(null)} />
    </div>
  );
}
