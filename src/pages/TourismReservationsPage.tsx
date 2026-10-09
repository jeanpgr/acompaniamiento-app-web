import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Clock,
  MessageCircle,
  Ticket,
  Undo2,
  Wallet,
} from "lucide-react";
import { getDetailTourism } from "@/api/details-tourism";
import { getServices } from "@/api/services";
import {
  confirmScheduleTourism,
  getSchedulesTourismByDetail,
  markRefundCompleteTourism,
  unconfirmScheduleTourism,
  type ScheduleStatus,
  type ScheduleTourismWithUser,
} from "@/api/schedules";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StatCard from "@/components/ui/StatCard";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
  CardActions,
} from "@/components/ui/CardGrid";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  EmptyCell,
  EmptyRow,
  TableHead,
  TableRow,
  type Column,
} from "@/components/ui/DataTable";
import {
  formatDateRange,
  formatMoney,
  formatTripMeta,
} from "@/components/tourism/tourismForm";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import { whatsappUrl } from "@/lib/whatsapp";

type Reservation = ScheduleTourismWithUser;

// ── Estados de una reserva de excursión ──
// El backend guarda "EN CURSO" cuando el pago se confirmó; aquí y en la app
// se muestra como "Confirmada".
type Group = "pending" | "confirmed" | "cancelled" | "past";

function groupOf(r: Reservation): Group {
  const s: ScheduleStatus = r.status ?? "PENDIENTE";
  if (s === "PENDIENTE") return "pending";
  if (s === "EN CURSO" || s === "COMPLETADO") return "confirmed";
  if (s === "CANCELADA") return "cancelled";
  return "past"; // OLVIDADA: el viaje salió sin que se confirmara
}

const TABS: { key: Group | "all"; label: string }[] = [
  { key: "pending", label: "Por confirmar" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "past", label: "Sin confirmar (viaje pasado)" },
  { key: "all", label: "Todas" },
];

const COLUMNS: Column[] = [
  "Reservó",
  "Pasajeros",
  "Contacto",
  "Total",
  "Estado",
  { label: "Acciones", className: "text-right" },
];

const toAmount = (v: string | null) => (v == null ? null : Number(v));

const formatCreated = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function StatusBadge({ r }: { r: Reservation }) {
  switch (groupOf(r)) {
    case "pending":
      return <Badge variant="warning">Por confirmar</Badge>;
    case "confirmed":
      return <Badge variant="success">Confirmada</Badge>;
    case "cancelled":
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="danger">Cancelada</Badge>
          <span className="text-xs text-ink-3">
            {!r.refund_status
              ? "Sin pago · sin reembolso"
              : r.refund_status === "REALIZADO"
                ? "Reembolso realizado"
                : "Reembolso por hacer"}
          </span>
        </div>
      );
    case "past":
      return <Badge>No confirmada</Badge>;
  }
}

function holderName(r: Reservation) {
  return r.user ? `${r.user.name} ${r.user.lastname}` : "Cuenta eliminada";
}

/**
 * Reservas de una excursión (página hija de Turismo). Quien reserva en la
 * app queda "Por confirmar" y envía el comprobante por WhatsApp; aquí el
 * administrador abre el chat, revisa el pago y confirma la reserva.
 */
export default function TourismReservationsPage() {
  const { tripId = "" } = useParams();
  const confirm = useConfirm();

  const trip = useQuery({
    queryKey: ["detail-tourism", tripId],
    queryFn: () => getDetailTourism(tripId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
  const serviceName = services.find(
    (s) => s.id === trip.data?.id_service,
  )?.name;
  const reservations = useQuery({
    queryKey: ["schedules-tourism", "detail", tripId],
    queryFn: () => getSchedulesTourismByDetail(tripId),
    // Llegan reservas nuevas desde la app mientras la pantalla está abierta.
    refetchInterval: LIVE_REFETCH_MS,
  });
  const items = reservations.data ?? [];

  const pendingCount = items.filter((r) => groupOf(r) === "pending").length;
  // Por defecto se abren las que esperan confirmación; si no hay, todas.
  const [tab, setTab] = useState<Group | "all" | null>(null);
  const activeTab = tab ?? (pendingCount > 0 ? "pending" : "all");
  const shown =
    activeTab === "all" ? items : items.filter((r) => groupOf(r) === activeTab);
  const emptyText =
    items.length === 0
      ? "Esta excursión todavía no tiene reservas"
      : activeTab === "pending"
        ? "No hay reservas por confirmar"
        : "No hay reservas en este estado";
  const countOf = (key: Group | "all") =>
    key === "all"
      ? items.length
      : items.filter((r) => groupOf(r) === key).length;

  const confirmed = items.filter((r) => groupOf(r) === "confirmed");
  const pending = items.filter((r) => groupOf(r) === "pending");
  const seats = (list: Reservation[]) => list.reduce((n, r) => n + r.quotas, 0);
  const income = confirmed.reduce(
    (sum, r) => sum + (toAmount(r.price_pay) ?? 0),
    0,
  );

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──
  const confirmMut = useMutation({
    mutationFn: confirmScheduleTourism,
    meta: {
      invalidates: "schedules-tourism",
      successMessage:
        "Reserva confirmada. El cliente ya la ve como confirmada en la app.",
      errorMessage: "No se pudo confirmar la reserva",
    },
  });
  const unconfirmMut = useMutation({
    mutationFn: unconfirmScheduleTourism,
    meta: {
      invalidates: "schedules-tourism",
      successMessage: "La reserva volvió a Por confirmar",
      errorMessage: "No se pudo deshacer la confirmación",
    },
  });
  const refundMut = useMutation({
    mutationFn: markRefundCompleteTourism,
    meta: {
      invalidates: "schedules-tourism",
      successMessage: "Reembolso marcado como realizado",
      errorMessage: "No se pudo marcar el reembolso",
    },
  });

  const tripName = trip.data?.name ?? "la excursión";
  const amountText = (r: Reservation) => {
    const amount = toAmount(r.price_pay);
    return amount != null ? ` por ${formatMoney(amount)}` : "";
  };

  const askConfirm = async (r: Reservation) => {
    if (
      await confirm({
        title: "¿Confirmar el pago de esta reserva?",
        message: `${holderName(r)} · ${r.quotas} ${r.quotas === 1 ? "cupo" : "cupos"}${amountText(r)}. Confírmala solo si ya revisaste el comprobante en WhatsApp.`,
        confirmLabel: "Sí, confirmar pago",
        tone: "primary",
      })
    )
      confirmMut.mutate(r.id);
  };

  const askUnconfirm = async (r: Reservation) => {
    if (
      await confirm({
        title: "¿Volver la reserva a Por confirmar?",
        message: `La reserva de ${holderName(r)} dejará de verse como confirmada en la app.`,
        confirmLabel: "Volver a Por confirmar",
        tone: "danger",
      })
    )
      unconfirmMut.mutate(r.id);
  };

  const askRefund = async (r: Reservation) => {
    if (
      await confirm({
        title: "¿Ya se hizo la transferencia del reembolso?",
        message: [
          `${holderName(r)}${amountText(r)}`,
          r.refund_bank_name &&
            `${r.refund_bank_name} · ${r.refund_account_type ?? ""} ${r.refund_bank_account ?? ""}`,
          r.refund_holder_cedula &&
            `Cédula del titular: ${r.refund_holder_cedula}`,
        ]
          .filter(Boolean)
          .join("\n"),
        confirmLabel: "Sí, reembolso realizado",
        tone: "primary",
      })
    )
      refundMut.mutate(r.id);
  };

  const renderActions = (r: Reservation) => {
    const group = groupOf(r);
    if (group === "pending")
      return (
        <Button
          size="sm"
          loading={confirmMut.isPending && confirmMut.variables === r.id}
          onClick={() => askConfirm(r)}
        >
          <BadgeCheck size={15} /> Confirmar pago
        </Button>
      );
    if (group === "confirmed" && r.status === "EN CURSO")
      return (
        <Button
          size="sm"
          variant="ghost"
          loading={unconfirmMut.isPending && unconfirmMut.variables === r.id}
          onClick={() => askUnconfirm(r)}
        >
          <Undo2 size={15} /> Deshacer
        </Button>
      );
    if (group === "cancelled" && r.refund_status === "EN_PROCESO")
      return (
        <Button
          size="sm"
          variant="secondary"
          loading={refundMut.isPending && refundMut.variables === r.id}
          onClick={() => askRefund(r)}
        >
          <Wallet size={15} /> Reembolso hecho
        </Button>
      );
    return null;
  };

  const contact = (r: Reservation) => {
    const url = whatsappUrl(
      r.phone_responsible,
      `Hola ${r.user?.name ?? ""}, te escribimos de ServiMayor por tu reserva de ${r.quotas} ${r.quotas === 1 ? "cupo" : "cupos"} para "${tripName}".`,
    );
    return (
      <div className="min-w-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-success-fg hover:underline"
            aria-label={`Escribir por WhatsApp a ${r.phone_responsible}`}
          >
            <MessageCircle size={16} aria-hidden="true" /> {r.phone_responsible}
          </a>
        ) : (
          <span className="text-sm text-ink-2">{r.phone_responsible}</span>
        )}
        {r.user?.email && (
          <p className="text-xs text-ink-3 truncate max-w-48">{r.user.email}</p>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Gestión servicios", to: "/services" },
            {
              label: serviceName ?? "Turismo",
              to: trip.data
                ? `/tourism-details?service=${trip.data.id_service}`
                : "/tourism-details",
            },
            { label: "Reservas" },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-ink">
          Reservas · {trip.data?.name ?? "…"}
        </h1>
        {trip.data && (
          <p className="text-[15px] text-ink-3 mt-1">
            {formatDateRange(trip.data.date_output, trip.data.date_arrival)} ·{" "}
            {formatTripMeta(trip.data.date_output, trip.data.date_arrival)}
          </p>
        )}
        <p className="text-sm text-ink-3 mt-2 max-w-2xl">
          Las reservas hechas en la app llegan como{" "}
          <strong>Por confirmar</strong>. Abre el WhatsApp del cliente, revisa
          el comprobante y pulsa <strong>Confirmar pago</strong>: la app le
          mostrará su reserva como confirmada.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={Clock}
          tone="warning"
          value={pending.length}
          label={`Por confirmar · ${seats(pending)} cupos`}
        />
        <StatCard
          icon={BadgeCheck}
          tone="success"
          value={confirmed.length}
          label={`Confirmadas · ${seats(confirmed)} cupos`}
        />
        <StatCard
          icon={Ticket}
          tone="info"
          value={
            trip.data
              ? `${trip.data.quotas_available}/${trip.data.quotas}`
              : "—"
          }
          label="Cupos disponibles"
        />
        <StatCard
          icon={Wallet}
          tone="primary"
          value={formatMoney(income)}
          label="Pagos confirmados"
        />
      </div>

      {/* Filtros */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Filtrar reservas por estado"
      >
        {TABS.map(({ key, label }) => {
          const count = countOf(key);
          if (count === 0 && key !== "all" && key !== "pending") return null;
          const selected = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={selected}
              className="chip"
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {reservations.isLoading ? (
          <TableSkeleton label="Cargando reservas…" />
        ) : (
          <>
          <div className="xl:hidden">
            <CardGrid empty={shown.length === 0 && emptyText}>
              {shown.map((r) => {
                const amount = toAmount(r.price_pay);
                const names = Array.isArray(r.names_persons)
                  ? r.names_persons
                  : [];
                return (
                  <GridCard key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-bold text-ink text-base wrap-break-word">
                          {holderName(r)}
                        </h2>
                        <p className="text-xs text-ink-3">
                          {formatCreated(r.created_at)}
                        </p>
                      </div>
                      <StatusBadge r={r} />
                    </div>
                    <CardFields>
                      <CardField label="Pasajeros">
                        {r.quotas} {r.quotas === 1 ? "cupo" : "cupos"}
                        {names.length > 0 && (
                          <span className="block text-xs text-ink-3">
                            {names.join(", ")}
                          </span>
                        )}
                      </CardField>
                      <CardField label="Contacto">{contact(r)}</CardField>
                      <CardField label="Total">
                        <span className="font-semibold">
                          {amount != null ? formatMoney(amount) : "—"}
                        </span>
                      </CardField>
                    </CardFields>
                    {renderActions(r) && (
                      <CardActions>{renderActions(r)}</CardActions>
                    )}
                  </GridCard>
                );
              })}
            </CardGrid>
          </div>
          <table className="hidden xl:table w-full">
            <TableHead columns={COLUMNS} />
            <tbody>
              {shown.map((r) => {
                const amount = toAmount(r.price_pay);
                const names = Array.isArray(r.names_persons)
                  ? r.names_persons
                  : [];
                return (
                  <TableRow key={r.id}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink text-sm">
                        {holderName(r)}
                      </p>
                      <p className="text-xs text-ink-3 whitespace-nowrap">
                        {formatCreated(r.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-ink-2 whitespace-nowrap">
                        {r.quotas} {r.quotas === 1 ? "cupo" : "cupos"}
                      </p>
                      <p
                        className="text-xs text-ink-3 truncate max-w-44"
                        title={names.join(", ")}
                      >
                        {names.join(", ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">{contact(r)}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-ink whitespace-nowrap">
                      {amount != null ? formatMoney(amount) : <EmptyCell />}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge r={r} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {renderActions(r)}
                    </td>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
              )}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}
