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
    <div className="card p-3.5 sm:p-5 min-w-0 @container">
      {/* Tarjeta angosta: el ícono va arriba y la cifra usa todo el ancho */}
      <div className="flex flex-col-reverse items-start gap-2 @[15rem]:flex-row @[15rem]:justify-between @[15rem]:gap-3">
        <div className="min-w-0 max-w-full">
          <p className="text-2xl @[15rem]:text-3xl font-bold text-ink tabular-nums wrap-break-word">
            {value}
          </p>
          <p className="text-[13px] sm:text-sm text-ink-3 mt-1 wrap-break-word">
            {label}
          </p>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.up ? "text-success-fg" : "text-danger-fg"}`}
            >
              {trend.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div
          className={`w-10 h-10 @[15rem]:w-12 @[15rem]:h-12 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}
          aria-hidden="true"
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
