import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

export type StatTone =
  | "info"
  | "warning"
  | "success"
  | "danger"
  | "accent"
  | "primary"
  | "neutral";

// Cada tono se resuelve a tokens de `index.css`; no se aceptan hex sueltos.
const TONES: Record<StatTone, string> = {
  info: "bg-info-bg text-info-fg",
  warning: "bg-warning-bg text-warning-fg",
  success: "bg-success-bg text-success-fg",
  danger: "bg-danger-bg text-danger-fg",
  accent: "bg-accent/15 text-accent-fg",
  primary: "bg-primary-soft text-primary",
  neutral: "bg-surface-2 text-ink-3",
};

interface Props {
  icon: LucideIcon;
  tone?: StatTone;
  value: string | number;
  label: string;
  trend?: { value: string; up: boolean };
}

export default function StatCard({
  icon: Icon,
  tone = "info",
  value,
  label,
  trend,
}: Props) {
  return (
    <div className="bg-surface rounded-xl p-5 shadow-[0_1px_2px_rgb(23_38_58/0.06)] border border-line">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-bold text-ink tabular-nums">{value}</p>
          <p className="text-sm text-ink-3 mt-1">{label}</p>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.up ? "text-success-fg" : "text-danger-fg"}`}
            >
              {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}
          aria-hidden="true"
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}
