import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Car,
  Clock,
  Footprints,
  MessageCircle,
  CircleCheckBig,
  Undo2,
  Wallet,
} from "lucide-react";
import { getDetailDaycare, type PricePeriod } from "@/api/details-daycare";
import { getServices } from "@/api/services";
import {
  confirmScheduleDaycare,
  getSchedulesDaycareByDetail,
  markRefundCompleteDaycare,
  unconfirmScheduleDaycare,
  completeScheduleDaycare,
  type ScheduleStatus,
  type ScheduleDaycareWithUser,
} from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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
import { formatMoney } from "@/components/tourism/tourismForm";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import { whatsappUrl } from "@/lib/whatsapp";

type Request = ScheduleDaycareWithUser;

// ── Estados de una solicitud de guardería ──
// El backend guarda "EN CURSO" cuando el pago se confirmó (y, con recogida,
// el vehículo está asignado): la app deja de mostrar "Ver datos de pago".
type Group = "pending" | "confirmed" | "cancelled" | "past";

function groupOf(r: Request): Group {
  const s: ScheduleStatus = r.status ?? "PENDIENTE";
  if (s === "PENDIENTE") return "pending";
  if (s === "EN CURSO" || s === "COMPLETADO") return "confirmed";
  if (s === "CANCELADA") return "cancelled";
  return "past";
}

const TABS: { key: Group | "all"; label: string }[] = [
  { key: "pending", label: "Por confirmar" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "cancelled", label: "Canceladas" },
  { key: "past", label: "No confirmadas" },
  { key: "all", label: "Todas" },
];

const COLUMNS: Column[] = [
  "Solicitó",
  "Beneficiario",
  "Traslado",
  "Contacto",
  "Precio",
  "Estado",
  { label: "Acciones", className: "text-right" },
];

const PERIOD_LABEL: Record<PricePeriod, string> = {
  dia: "al día",
  semana: "a la semana",
  mes: "al mes",
};

const formatCreated = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const isPickup = (r: Request) => r.transfer === "PICK_HOME";

/** Cuenta (perfil) que hizo la solicitud desde la app. */
function requesterName(r: Request) {
  return r.user ? `${r.user.name} ${r.user.lastname}` : "Cuenta eliminada";
}

/** Adulto mayor que irá a la guardería, tal como se escribió al solicitar. */
function beneficiaryName(r: Request) {
  return [r.name, r.lastname].filter(Boolean).join(" ") || null;
}

/** Persona que irá a la guardería (o la cuenta, si no se escribió). */
function attendeeName(r: Request) {
  const own = [r.name, r.lastname].filter(Boolean).join(" ");
  if (own) return own;
  return r.user ? `${r.user.name} ${r.user.lastname}` : "Cuenta eliminada";
}

function StatusBadge({ r }: { r: Request }) {
  switch (groupOf(r)) {
    case "pending":
      return <Badge variant="warning">Por confirmar</Badge>;
    case "confirmed":
      return (
        <Badge variant="success">
          {r.status === "COMPLETADO" ? "Completada" : "Confirmada"}
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

/**
 * Solicitudes de un plan de guardería (página hija de Guardería). Quien
 * solicita en la app queda "Por confirmar" y envía el comprobante por
 * WhatsApp; aquí el administrador revisa el pago y confirma la solicitud
 * (con recogida a domicilio, eligiendo también el vehículo).
 */
export default function DaycareRequestsPage() {
  const { planId = "" } = useParams();
  const confirm = useConfirm();

  const plan = useQuery({
    queryKey: ["detail-daycare", planId],
    queryFn: () => getDetailDaycare(planId),
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
  const serviceName = services.find(
    (s) => s.id === plan.data?.id_service,
  )?.name;
  const requests = useQuery({
    queryKey: ["schedules-daycare", "detail", planId],
    queryFn: () => getSchedulesDaycareByDetail(planId),
    // Llegan solicitudes nuevas desde la app mientras la pantalla está abierta.
    refetchInterval: LIVE_REFETCH_MS,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });
  const activeVehicles = vehicles.filter((v) => v.active);
  const items = requests.data ?? [];

  const pendingCount = items.filter((r) => groupOf(r) === "pending").length;
  // Por defecto se abren las que esperan confirmación; si no hay, todas.
  const [tab, setTab] = useState<Group | "all" | null>(null);
  const activeTab = tab ?? (pendingCount > 0 ? "pending" : "all");
  const shown =
    activeTab === "all" ? items : items.filter((r) => groupOf(r) === activeTab);
  const emptyText =
    items.length === 0
      ? "Este plan todavía no tiene solicitudes"
      : activeTab === "pending"
        ? "No hay solicitudes por confirmar"
        : "No hay solicitudes en este estado";
  const countOf = (key: Group | "all") =>
    key === "all"
      ? items.length
      : items.filter((r) => groupOf(r) === key).length;

  // ── Precio según el traslado elegido ──
  const mode = plan.data?.service_mode ?? {};
  const period = mode.price_period ? PERIOD_LABEL[mode.price_period] : null;
  const priceOf = (r: Request) =>
    (isPickup(r) ? mode.price_pickup : mode.price_dropoff) ?? null;
  const priceText = (r: Request) => {
    const price = priceOf(r);
    return price != null
      ? `${formatMoney(price)}${period ? ` ${period}` : ""}`
      : null;
  };
  const confirmed = items.filter((r) => groupOf(r) === "confirmed");
  const income = confirmed.reduce((sum, r) => sum + (priceOf(r) ?? 0), 0);

  // Solicitud con recogida que espera elegir vehículo para confirmarse.
  const [vehicleTarget, setVehicleTarget] = useState<Request | null>(null);
  const [vehicleId, setVehicleId] = useState("");

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──
  const confirmMut = useMutation({
    mutationFn: confirmScheduleDaycare,
    meta: {
      invalidates: "schedules-daycare",
      successMessage:
        "Solicitud confirmada. El cliente ya no ve los datos de pago en la app.",
      errorMessage: "No se pudo confirmar la solicitud",
    },
    onSuccess: () => setVehicleTarget(null),
  });
  const unconfirmMut = useMutation({
    mutationFn: unconfirmScheduleDaycare,
    meta: {
      invalidates: "schedules-daycare",
      successMessage: "La solicitud volvió a Por confirmar",
      errorMessage: "No se pudo deshacer la confirmación",
    },
  });
  const completeMut = useMutation({
    mutationFn: completeScheduleDaycare,
    meta: {
      invalidates: "schedules-daycare",
      successMessage:
        "Servicio finalizado. El cliente ya puede calificarlo en la app.",
      errorMessage: "No se pudo finalizar el servicio",
    },
  });
  const refundMut = useMutation({
    mutationFn: markRefundCompleteDaycare,
    meta: {
      invalidates: "schedules-daycare",
      successMessage: "Reembolso marcado como realizado",
      errorMessage: "No se pudo marcar el reembolso",
    },
  });

  const summary = (r: Request) => {
    const price = priceText(r);
    return `${attendeeName(r)}${price ? ` · ${price}` : ""}`;
  };

  const askConfirm = async (r: Request) => {
    // Con recogida y sin vehículo, se elige el vehículo en el mismo paso.
    if (isPickup(r) && !r.id_vehicle) {
      setVehicleId("");
      setVehicleTarget(r);
      return;
    }
    if (
      await confirm({
        title: "¿Confirmar el pago de esta solicitud?",
        message: `${summary(r)}. Confírmala solo si ya revisaste el comprobante en WhatsApp.`,
        confirmLabel: "Sí, confirmar pago",
        tone: "primary",
      })
    )
      confirmMut.mutate({ id: r.id });
  };

  const askUnconfirm = async (r: Request) => {
    if (
      await confirm({
        title: "¿Volver la solicitud a Por confirmar?",
        message: `${attendeeName(r)} volverá a ver los datos de pago en la app.`,
        confirmLabel: "Volver a Por confirmar",
        tone: "danger",
      })
    )
      unconfirmMut.mutate(r.id);
  };

  const askComplete = async (r: Request) => {
    if (
      await confirm({
        title: "¿Finalizar este servicio de guardería?",
        message: `${attendeeName(r)} dejará de tenerlo como servicio activo; en la app pasará a Completadas y podrá calificarlo.`,
        confirmLabel: "Sí, finalizar",
        tone: "primary",
      })
    )
      completeMut.mutate(r.id);
  };

  const askRefund = async (r: Request) => {
    if (
      await confirm({
        title: "¿Ya se hizo la transferencia del reembolso?",
        message: [
          summary(r),
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

  const renderActions = (r: Request) => {
    const group = groupOf(r);
    if (group === "pending")
      return (
        <Button
          size="sm"
          loading={confirmMut.isPending && confirmMut.variables?.id === r.id}
          onClick={() => askConfirm(r)}
        >
          <BadgeCheck size={15} /> Confirmar pago
        </Button>
      );
    // Servicio continuo: sigue activo hasta que el panel lo finaliza.
    if (group === "confirmed" && r.status === "EN CURSO")
      return (
        <div className="inline-flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={completeMut.isPending && completeMut.variables === r.id}
            onClick={() => askComplete(r)}
          >
            <CircleCheckBig size={15} /> Finalizar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={unconfirmMut.isPending && unconfirmMut.variables === r.id}
            onClick={() => askUnconfirm(r)}
          >
            <Undo2 size={15} /> Deshacer
          </Button>
        </div>
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

  const transfer = (r: Request) =>
    isPickup(r) ? (
      <div>
        <p className="inline-flex items-center gap-1 text-sm text-ink-2 whitespace-nowrap">
          <Car size={16} aria-hidden="true" /> Recogida a domicilio
        </p>
        {r.address_pick_home && (
          <p
            className="text-xs text-ink-3 line-clamp-2 max-w-56"
            title={r.address_pick_home}
          >
            {r.address_pick_home}
          </p>
        )}
        <p className="text-xs text-ink-3">
          {r.vehicle
            ? `${r.vehicle.name} · ${r.vehicle.license_plate}`
            : "Sin vehículo"}
        </p>
      </div>
    ) : (
      <p className="inline-flex items-center gap-1 text-sm text-ink-2 whitespace-nowrap">
        <Footprints size={16} aria-hidden="true" /> La familia lo lleva
      </p>
    );

  const planName = mode.name ?? "el plan de guardería";
  const contact = (r: Request) => {
    const phone = r.user?.phone ?? null;
    if (!phone && !r.user?.email) return <EmptyCell />;
    const url = whatsappUrl(
      phone,
      `Hola ${r.user?.name ?? ""}, te escribimos de ServiMayor por tu solicitud de "${planName}".`,
    );
    return (
      <div className="min-w-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-success-fg hover:underline"
            aria-label={`Escribir por WhatsApp a ${phone}`}
          >
            <MessageCircle size={16} aria-hidden="true" /> {phone}
          </a>
        ) : (
          phone && <span className="text-sm text-ink-2">{phone}</span>
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
              label: serviceName ?? "Guardería",
              to: plan.data
                ? `/daycare-details?service=${plan.data.id_service}`
                : "/daycare-details",
            },
            { label: "Solicitudes" },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-ink">
          Solicitudes · {plan.data ? planName : "…"}
        </h1>
        <p className="text-sm text-ink-3 mt-2 max-w-2xl">
          Las solicitudes hechas en la app llegan como{" "}
          <strong>Por confirmar</strong>. Abre el WhatsApp del cliente, revisa
          el comprobante y pulsa <strong>Confirmar pago</strong>: la app dejará
          de mostrarle los datos de pago. Si eligió recogida a domicilio,
          también eliges el vehículo.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
          icon={Wallet}
          tone="primary"
          value={formatMoney(income)}
          label={`Pagos confirmados${period ? ` (${period})` : ""}`}
        />
      </div>

      {/* Filtros */}
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="Filtrar solicitudes por estado"
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

      {/* Tarjetas bajo 2xl (7 columnas no caben); tabla desde 2xl */}
      <div className="card overflow-hidden">
        {requests.isLoading ? (
          <TableSkeleton label="Cargando solicitudes…" />
        ) : (
          <>
            <div className="2xl:hidden">
              <CardGrid empty={shown.length === 0 && emptyText}>
                {shown.map((r) => {
                  const price = priceText(r);
                  return (
                    <GridCard key={r.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-bold text-ink text-base wrap-break-word">
                            {requesterName(r)}
                          </h2>
                          <p className="text-xs text-ink-3">
                            {formatCreated(r.created_at)}
                          </p>
                        </div>
                        <StatusBadge r={r} />
                      </div>
                      <CardFields>
                        <CardField label="Beneficiario">
                          {beneficiaryName(r) ?? "—"}
                        </CardField>
                        <CardField label="Traslado">{transfer(r)}</CardField>
                        <CardField label="Contacto">{contact(r)}</CardField>
                        <CardField label="Precio">
                          <span className="font-semibold">{price ?? "—"}</span>
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
            <table className="hidden 2xl:table w-full">
              <TableHead columns={COLUMNS} />
              <tbody>
                {shown.map((r) => {
                  const price = priceText(r);
                  return (
                    <TableRow key={r.id}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-ink text-sm">
                          {requesterName(r)}
                        </p>
                        <p className="text-xs text-ink-3 whitespace-nowrap">
                          {formatCreated(r.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ink">
                        {beneficiaryName(r) ?? <EmptyCell />}
                      </td>
                      <td className="px-4 py-3.5">{transfer(r)}</td>
                      <td className="px-4 py-3.5">{contact(r)}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-ink whitespace-nowrap">
                        {price ?? <EmptyCell />}
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

      {/* Confirmar pago + vehículo (solicitudes con recogida a domicilio) */}
      <Modal
        open={!!vehicleTarget}
        onClose={() => !confirmMut.isPending && setVehicleTarget(null)}
        title="Confirmar pago y asignar vehículo"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setVehicleTarget(null)}
              disabled={confirmMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              loading={confirmMut.isPending}
              disabled={!vehicleId}
              onClick={() =>
                vehicleTarget &&
                confirmMut.mutate({
                  id: vehicleTarget.id,
                  id_vehicle: vehicleId,
                })
              }
            >
              Confirmar pago
            </Button>
          </>
        }
      >
        {vehicleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              {summary(vehicleTarget)}. Confírmala solo si ya revisaste el
              comprobante en WhatsApp.
            </p>
            {vehicleTarget.address_pick_home && (
              <p className="text-sm text-ink-3">
                Recogida en: {vehicleTarget.address_pick_home}
              </p>
            )}
            <div>
              <label
                htmlFor="daycare-request-vehicle"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Vehículo para la recogida{" "}
                <span className="text-danger-fg">*</span>
              </label>
              <select
                id="daycare-request-vehicle"
                className="field"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Seleccionar vehículo</option>
                {activeVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.license_plate}
                  </option>
                ))}
              </select>
              {activeVehicles.length === 0 && (
                <p className="text-danger-fg text-xs font-semibold mt-1">
                  No hay vehículos activos. Registra uno en Vehículos.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
