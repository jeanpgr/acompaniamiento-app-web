import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  MessageCircle,
  Undo2,
  Video,
  Wallet,
} from "lucide-react";
import { getDetailTraining } from "@/api/details-training";
import { getServices } from "@/api/services";
import {
  confirmScheduleTraining,
  getSchedulesTrainingByDetail,
  markRefundCompleteTraining,
  unconfirmScheduleTraining,
  type ScheduleStatus,
  type ScheduleTrainingWithUser,
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
  EmptyRow,
  TableHead,
  TableRow,
  type Column,
} from "@/components/ui/DataTable";
import {
  formatDateTime,
  formatDuration,
} from "@/components/training/trainingForm";
import { formatMoney } from "@/components/tourism/tourismForm";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import { whatsappUrl } from "@/lib/whatsapp";

type Enrollment = ScheduleTrainingWithUser;

// ── Estados de una inscripción ──
// El backend guarda "EN CURSO" cuando el pago se confirmó: desde ahí la app
// muestra "Unirse a la reunión" en lugar de "Ver datos de pago".
type Group = "pending" | "confirmed" | "cancelled" | "past";

function groupOf(r: Enrollment): Group {
  const s: ScheduleStatus = r.status ?? "PENDIENTE";
  if (s === "PENDIENTE") return "pending";
  if (s === "EN CURSO" || s === "COMPLETADO") return "confirmed";
  if (s === "CANCELADA") return "cancelled";
  return "past"; // OLVIDADA: el taller empezó sin que se confirmara
}

const TABS: { key: Group | "all"; label: string }[] = [
  { key: "pending", label: "Por confirmar" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "past", label: "Sin confirmar (taller pasado)" },
  { key: "all", label: "Todas" },
];

const COLUMNS: Column[] = [
  "Inscrito",
  "Contacto",
  "Estado",
  { label: "Acciones", className: "text-right" },
];

const formatCreated = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function StatusBadge({ r }: { r: Enrollment }) {
  switch (groupOf(r)) {
    case "pending":
      return <Badge variant="warning">Por confirmar</Badge>;
    case "confirmed":
      return (
        <Badge variant="success">
          {r.status === "COMPLETADO" ? "Asistió" : "Confirmada"}
        </Badge>
      );
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

/** Persona inscrita (lo que escribió en la app). */
const attendeeName = (r: Enrollment) => `${r.name} ${r.lastname}`;

/**
 * Inscripciones de una capacitación (página hija de Capacitación). Quien se
 * inscribe en la app queda "Por confirmar" y envía el comprobante por
 * WhatsApp; aquí el administrador revisa el pago y confirma la inscripción.
 * Confirmada, la app le muestra el botón "Unirse a la reunión".
 */
export default function TrainingEnrollmentsPage() {
  const { trainingId = "" } = useParams();
  const confirm = useConfirm();

  const training = useQuery({
    queryKey: ["detail-training", trainingId],
    queryFn: () => getDetailTraining(trainingId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
  const serviceName = services.find(
    (s) => s.id === training.data?.id_service,
  )?.name;
  const enrollments = useQuery({
    queryKey: ["schedules-training", "detail", trainingId],
    queryFn: () => getSchedulesTrainingByDetail(trainingId),
    // Llegan inscripciones nuevas desde la app mientras la pantalla está abierta.
    refetchInterval: LIVE_REFETCH_MS,
  });
  const items = enrollments.data ?? [];

  const pendingCount = items.filter((r) => groupOf(r) === "pending").length;
  // Por defecto se abren las que esperan confirmación; si no hay, todas.
  const [tab, setTab] = useState<Group | "all" | null>(null);
  const activeTab = tab ?? (pendingCount > 0 ? "pending" : "all");
  const shown =
    activeTab === "all" ? items : items.filter((r) => groupOf(r) === activeTab);
  const emptyText =
    items.length === 0
      ? "Esta capacitación todavía no tiene inscripciones"
      : activeTab === "pending"
        ? "No hay inscripciones por confirmar"
        : "No hay inscripciones en este estado";
  const countOf = (key: Group | "all") =>
    key === "all"
      ? items.length
      : items.filter((r) => groupOf(r) === key).length;

  const confirmed = items.filter((r) => groupOf(r) === "confirmed");
  const price =
    training.data?.price != null ? Number(training.data.price) : null;
  const isFree = training.data != null && price == null;

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──
  const confirmMut = useMutation({
    mutationFn: confirmScheduleTraining,
    meta: {
      invalidates: "schedules-training",
      successMessage:
        "Inscripción confirmada. El cliente ya ve el botón para unirse en la app.",
      errorMessage: "No se pudo confirmar la inscripción",
    },
  });
  const unconfirmMut = useMutation({
    mutationFn: unconfirmScheduleTraining,
    meta: {
      invalidates: "schedules-training",
      successMessage: "La inscripción volvió a Por confirmar",
      errorMessage: "No se pudo deshacer la confirmación",
    },
  });
  const refundMut = useMutation({
    mutationFn: markRefundCompleteTraining,
    meta: {
      invalidates: "schedules-training",
      successMessage: "Reembolso marcado como realizado",
      errorMessage: "No se pudo marcar el reembolso",
    },
  });

  const topic = training.data?.topic ?? "la capacitación";
  const priceText = price != null ? ` por ${formatMoney(price)}` : "";

  const askConfirm = async (r: Enrollment) => {
    if (
      await confirm({
        title: isFree
          ? "¿Confirmar esta inscripción?"
          : "¿Confirmar el pago de esta inscripción?",
        message: isFree
          ? `${attendeeName(r)} podrá unirse a la reunión desde la app.`
          : `${attendeeName(r)}${priceText}. Confírmala solo si ya revisaste el comprobante en WhatsApp. Desde la app podrá unirse a la reunión.`,
        confirmLabel: isFree ? "Sí, confirmar" : "Sí, confirmar pago",
        tone: "primary",
      })
    )
      confirmMut.mutate(r.id);
  };

  const askUnconfirm = async (r: Enrollment) => {
    if (
      await confirm({
        title: "¿Volver la inscripción a Por confirmar?",
        message: `${attendeeName(r)} dejará de ver el botón para unirse y volverá a ver los datos de pago en la app.`,
        confirmLabel: "Volver a Por confirmar",
        tone: "danger",
      })
    )
      unconfirmMut.mutate(r.id);
  };

  const askRefund = async (r: Enrollment) => {
    if (
      await confirm({
        title: "¿Ya se hizo la transferencia del reembolso?",
        message: [
          `${attendeeName(r)}${priceText}`,
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

  const renderActions = (r: Enrollment) => {
    const group = groupOf(r);
    if (group === "pending")
      return (
        <Button
          size="sm"
          loading={confirmMut.isPending && confirmMut.variables === r.id}
          onClick={() => askConfirm(r)}
        >
          <BadgeCheck size={15} /> {isFree ? "Confirmar" : "Confirmar pago"}
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

  const contact = (r: Enrollment) => {
    const url = whatsappUrl(
      r.phone,
      `Hola ${r.name}, te escribimos de ServiMayor por tu inscripción a "${topic}".`,
    );
    return (
      <div className="min-w-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-success-fg hover:underline"
            aria-label={`Escribir por WhatsApp a ${r.phone}`}
          >
            <MessageCircle size={16} aria-hidden="true" /> {r.phone}
          </a>
        ) : (
          <span className="text-sm text-ink-2">{r.phone}</span>
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
              label: serviceName ?? "Capacitación",
              to: training.data
                ? `/training-details?service=${training.data.id_service}`
                : "/training-details",
            },
            { label: "Inscripciones" },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-ink">
          Inscripciones · {training.data?.topic ?? "…"}
        </h1>
        {training.data && (
          <p className="text-[15px] text-ink-3 mt-1">
            {formatDateTime(training.data.date_time)} ·{" "}
            {formatDuration(training.data.duration)}
          </p>
        )}
        <p className="text-sm text-ink-3 mt-2 max-w-2xl">
          Las inscripciones hechas en la app llegan como{" "}
          <strong>Por confirmar</strong>. Abre el WhatsApp del cliente, revisa
          el comprobante y pulsa <strong>Confirmar pago</strong>: la app dejará
          de mostrarle los datos de pago y le mostrará el botón{" "}
          <strong>Unirse a la reunión</strong>.
        </p>
      </div>

      {/* Sin enlace, los confirmados no tienen a qué unirse. */}
      {training.data && !training.data.link_meet && (
        <div
          role="status"
          className="flex items-start gap-2 mb-6 p-4 rounded-xl bg-warning-bg text-warning-fg text-sm font-medium"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Esta capacitación no tiene enlace de reunión. Agrégalo editándola
            (ícono de lápiz en la lista de capacitaciones) para que los
            inscritos confirmados vean el botón{" "}
            <strong>Unirse a la reunión</strong>.
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={Clock}
          tone="warning"
          value={pendingCount}
          label="Por confirmar"
        />
        <StatCard
          icon={BadgeCheck}
          tone="success"
          value={confirmed.length}
          label="Confirmadas"
        />
        <StatCard
          icon={Video}
          tone="info"
          value={training.data ? (training.data.link_meet ? "Sí" : "No") : "—"}
          label="Enlace de reunión"
        />
        <StatCard
          icon={Wallet}
          tone="primary"
          value={
            isFree
              ? "Gratuito"
              : price != null
                ? formatMoney(price * confirmed.length)
                : "—"
          }
          label="Pagos confirmados"
        />
      </div>

      {/* Filtros */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Filtrar inscripciones por estado"
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

      {/* Tarjetas bajo xl (área angosta); tabla desde xl */}
      <div className="card overflow-hidden">
        {enrollments.isLoading ? (
          <TableSkeleton label="Cargando inscripciones…" />
        ) : (
          <>
          <div className="xl:hidden">
            <CardGrid empty={shown.length === 0 && emptyText}>
              {shown.map((r) => (
                <GridCard key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-ink text-base wrap-break-word">
                        {attendeeName(r)}
                      </h2>
                      <p className="text-xs text-ink-3">
                        {formatCreated(r.created_at)}
                      </p>
                    </div>
                    <StatusBadge r={r} />
                  </div>
                  <CardFields>
                    <CardField label="Contacto">{contact(r)}</CardField>
                  </CardFields>
                  {renderActions(r) && (
                    <CardActions>{renderActions(r)}</CardActions>
                  )}
                </GridCard>
              ))}
            </CardGrid>
          </div>
          <table className="hidden xl:table w-full">
            <TableHead columns={COLUMNS} />
            <tbody>
              {shown.map((r) => (
                <TableRow key={r.id}>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-ink text-sm">
                      {attendeeName(r)}
                    </p>
                    <p className="text-xs text-ink-3">
                      {formatCreated(r.created_at)}
                      {r.user &&
                        `${r.user.name} ${r.user.lastname}` !==
                          attendeeName(r) &&
                        ` · Cuenta: ${r.user.name} ${r.user.lastname}`}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">{contact(r)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge r={r} />
                  </td>
                  <td className="px-4 py-3.5 text-right">{renderActions(r)}</td>
                </TableRow>
              ))}
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
