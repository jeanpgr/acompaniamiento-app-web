import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/**
 * Cómo comparar con el periodo anterior:
 * - "percent": variación relativa (+25 %).
 * - "points": diferencia absoluta en puntos porcentuales (+4,5 pts).
 * - "value": diferencia absoluta con un decimal (+0,3).
 */
export type DeltaMode = "percent" | "points" | "value";

interface DeltaProps {
  current: number | null;
  previous: number | null;
  mode?: DeltaMode;
  /** false cuando subir es malo (cancelaciones). */
  upIsGood?: boolean;
  periodLabel: string;
}

const dec1 = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

/** Variación contra el periodo anterior: signo, flecha y color por dirección. */
export function Delta({
  current,
  previous,
  mode = "percent",
  upIsGood = true,
  periodLabel,
}: DeltaProps) {
  if (current == null || previous == null)
    return <p className="text-xs text-ink-3 mt-2">Sin datos para comparar</p>;

  let diff = current - previous;
  let text: string;
  if (mode === "percent") {
    if (previous === 0) {
      return (
        <p className="text-xs text-ink-3 mt-2">
          {current === 0 ? "Igual que" : "Sin actividad en"} {periodLabel}
        </p>
      );
    }
    const pct = (diff / previous) * 100;
    diff = pct;
    text = `${dec1.format(Math.abs(pct))} %`;
  } else {
    text = `${dec1.format(Math.abs(diff))}${mode === "points" ? " pts" : ""}`;
  }

  const flat = Math.abs(diff) < 0.05;
  const good = flat ? null : diff > 0 === upIsGood;
  const Icon = flat ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
  const tone =
    good == null ? "text-ink-3" : good ? "text-success-fg" : "text-danger-fg";
  const sign = flat ? "" : diff > 0 ? "+" : "−";
  return (
    <p className={`flex items-center gap-1 text-xs mt-2 ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="font-semibold">
        {flat ? "Sin cambios" : `${sign}${text}`}
      </span>
      <span className="text-ink-3">vs {periodLabel}</span>
    </p>
  );
}

/** Indicador del periodo: etiqueta, valor y variación. */
export default function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  delta: DeltaProps;
}) {
  return (
    <div className="bg-surface rounded-xl p-5 shadow-[0_1px_2px_rgb(23_38_58/0.06)] border border-line min-w-0">
      <div className="flex items-center gap-2 text-ink-3">
        <Icon size={16} aria-hidden="true" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-3xl font-semibold text-ink mt-2">{value}</p>
      {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
      <Delta {...delta} />
    </div>
  );
}
