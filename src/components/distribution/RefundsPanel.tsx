import { CheckCircle, Landmark } from "lucide-react";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import type { Unified } from "./schedules";

interface Props {
  cancelled: Unified[];
  /** Cita cuyo reembolso se está guardando. */
  savingId: string | null;
  onMarkRefunded: (s: Unified) => void;
}

/** Citas canceladas con los datos para devolver el dinero. */
export default function RefundsPanel({ cancelled, savingId, onMarkRefunded }: Props) {
  if (cancelled.length === 0) return null;
  return (
    <div className="mt-3 bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2">
        <Landmark size={14} className="text-danger-fg" />
        <span className="font-semibold text-ink text-sm">
          Reembolsos ({cancelled.length})
        </span>
      </div>
      <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
        {cancelled.map((s) => {
          const st = serviceTypeStyle(s.serviceType);
          const isSaving = savingId === s.id;
          return (
            <div
              key={`refund-${s.originalType}-${s.id}`}
              className="bg-surface-2 rounded-lg p-3 border border-line"
            >
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${st.badge}`}
              >
                {st.label}
              </span>
              <p className="font-semibold text-ink text-sm leading-tight">
                {s.title}
              </p>
              <p className="text-xs text-ink-3 mt-1">{s.personName}</p>
              {(s.refundBank || s.refundAccount) && (
                <p className="text-xs text-ink-3 mt-1">
                  {s.refundAccountType ?? "Cuenta"} · {s.refundBank ?? "—"} ·{" "}
                  {s.refundAccount ?? "—"}
                  {s.refundHolderCedula ? ` · CC ${s.refundHolderCedula}` : ""}
                </p>
              )}
              {s.refundStatus !== "REALIZADO" ? (
                <button
                  type="button"
                  onClick={() => onMarkRefunded(s)}
                  disabled={isSaving}
                  className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
                >
                  {isSaving ? "Guardando…" : "Marcar reembolso realizado"}
                </button>
              ) : (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success-fg bg-success-bg rounded-lg py-1.5 px-2">
                  <CheckCircle size={12} /> Reembolso realizado
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
