import { CheckCircle, Landmark } from "lucide-react";
import ServiceSections from "./ServiceSections";
import type { Unified } from "./schedules";

interface Props {
  cancelled: Unified[];
  /** Cita cuyo reembolso se está guardando. */
  savingId: string | null;
  onMarkRefunded: (s: Unified) => void;
}

// Las canceladas antes de confirmar el pago no tienen reembolso (null).
const isRefundPending = (s: Unified) => s.refundStatus === "EN_PROCESO";
const hasRefund = (s: Unified) => s.refundStatus != null;

/**
 * Citas canceladas con los datos para devolver el dinero, agrupadas por
 * tipo de servicio en secciones desplegables. El distintivo de cada sección
 * cuenta los reembolsos que faltan por hacer.
 */
export default function RefundsPanel({
  cancelled,
  savingId,
  onMarkRefunded,
}: Props) {
  const refunds = cancelled.filter(hasRefund);
  if (refunds.length === 0) return null;
  const pendingCount = refunds.filter(isRefundPending).length;

  return (
    <div className="card overflow-hidden">
      <div className="h-14 px-5 border-b border-line flex items-center gap-2.5">
        <Landmark size={16} className="text-danger-fg" />
        <span className="font-bold text-ink text-base">
          Reembolsos ({refunds.length})
        </span>
        {pendingCount > 0 && (
          <span className="ml-auto text-xs text-warning-fg font-semibold">
            {pendingCount} por hacer
          </span>
        )}
      </div>
      <div className="max-h-[50vh] overflow-y-auto">
        <ServiceSections
          items={refunds}
          idPrefix="refunds"
          emptyText="Sin reembolsos"
          countOf={(list) => list.filter(isRefundPending).length}
          renderItem={(s) => (
            <RefundCard
              s={s}
              saving={savingId === s.id}
              onMarkRefunded={() => onMarkRefunded(s)}
            />
          )}
        />
      </div>
    </div>
  );
}

function RefundCard({
  s,
  saving,
  onMarkRefunded,
}: {
  s: Unified;
  saving: boolean;
  onMarkRefunded: () => void;
}) {
  return (
    <div className="bg-surface rounded-xl p-3.5 shadow-card">
      <p className="font-semibold text-ink text-sm leading-tight">{s.title}</p>
      <p className="text-xs text-ink-3 mt-1">{s.personName}</p>
      {(s.refundBank || s.refundAccount) && (
        <p className="text-xs text-ink-3 mt-1">
          {s.refundAccountType ?? "Cuenta"} · {s.refundBank ?? "—"} ·{" "}
          {s.refundAccount ?? "—"}
          {s.refundHolderCedula ? ` · CC ${s.refundHolderCedula}` : ""}
        </p>
      )}
      {isRefundPending(s) ? (
        <button
          type="button"
          onClick={onMarkRefunded}
          disabled={saving}
          className="mt-2.5 w-full min-h-9 rounded-lg text-[13px] font-semibold disabled:opacity-50 bg-primary text-white shadow-raised hover:bg-primary-hover transition-colors"
        >
          {saving ? "Guardando…" : "Marcar reembolso realizado"}
        </button>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-success-fg bg-success-bg rounded-lg py-2 px-2.5">
          <CheckCircle size={14} /> Reembolso realizado
        </div>
      )}
    </div>
  );
}
