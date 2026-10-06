import { CheckCircle, Landmark } from "lucide-react";
import ServiceSections from "./ServiceSections";
import type { Unified } from "./schedules";

interface Props {
  cancelled: Unified[];
  /** Cita cuyo reembolso se está guardando. */
  savingId: string | null;
  onMarkRefunded: (s: Unified) => void;
}

const isRefundPending = (s: Unified) => s.refundStatus !== "REALIZADO";

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
  if (cancelled.length === 0) return null;
  const pendingCount = cancelled.filter(isRefundPending).length;

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="h-12 px-4 border-b border-line flex items-center gap-2">
        <Landmark size={14} className="text-danger-fg" />
        <span className="font-semibold text-ink text-sm">
          Reembolsos ({cancelled.length})
        </span>
        {pendingCount > 0 && (
          <span className="ml-auto text-xs text-warning-fg font-medium">
            {pendingCount} por hacer
          </span>
        )}
      </div>
      <div className="max-h-[50vh] overflow-y-auto">
        <ServiceSections
          items={cancelled}
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
    <div className="bg-surface-2 rounded-lg p-3 border border-line">
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
          className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          {saving ? "Guardando…" : "Marcar reembolso realizado"}
        </button>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success-fg bg-success-bg rounded-lg py-1.5 px-2">
          <CheckCircle size={12} /> Reembolso realizado
        </div>
      )}
    </div>
  );
}
