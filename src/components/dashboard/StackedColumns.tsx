import { useId, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";

export interface Series {
  name: string;
  /** Color de la marca (token CSS); el texto nunca lo usa. */
  color: string;
}

export interface Column {
  /** Etiqueta corta del eje X. */
  label: string;
  /** Etiqueta completa para el tooltip y la tabla. */
  longLabel: string;
  /** Un valor por serie, en el orden de `series`. */
  values: number[];
}

interface Props {
  series: Series[];
  columns: Column[];
  format: (v: number) => string;
  /** Descripción del gráfico para lectores de pantalla. */
  title: string;
  emptyText: string;
  /** Conteos: el eje Y solo muestra marcas enteras. */
  integer?: boolean;
}

const PLOT_HEIGHT = 176;
const MAX_X_LABELS = 8;

/** Techo "redondo" para el eje Y (1, 2, 5 × 10ⁿ). */
function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/**
 * Columnas apiladas en HTML: una columna por tramo, un segmento por serie
 * (orden fijo), 2 px de separación entre segmentos y borde redondeado solo
 * arriba. Cada columna es su propia zona de hover/foco con tooltip; la vista
 * de tabla muestra los mismos números sin depender del color ni del mouse.
 */
export default function StackedColumns({
  series,
  columns,
  format,
  title,
  emptyText,
  integer = false,
}: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();

  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = Math.max(niceMax(Math.max(0, ...totals)), integer ? 2 : 0);
  const mid = max / 2;
  const ticks = !integer || Number.isInteger(mid) ? [max, mid, 0] : [max, 0];
  const empty = totals.every((t) => t === 0);
  // Etiquetas del eje X espaciadas para que no se encimen.
  const every = Math.max(1, Math.ceil(columns.length / MAX_X_LABELS));

  const toggle = (
    <div
      className="segmented p-0.5"
      role="group"
      aria-label="Vista"
    >
      {(
        [
          ["chart", "Gráfico", BarChart3],
          ["table", "Tabla", Table2],
        ] as const
      ).map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          aria-pressed={view === key}
          className="segment min-h-7 px-2.5 text-[13px]"
        >
          <Icon size={15} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );

  // Leyenda: siempre presente con 2+ series (el color nunca va solo).
  const legend =
    series.length > 1 ? (
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <li
            key={s.name}
            className="flex items-center gap-1.5 text-xs text-ink-2"
          >
            <span
              className="w-2.5 h-2.5 rounded-[3px]"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />
            {s.name}
          </li>
        ))}
      </ul>
    ) : (
      <span />
    );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        {legend}
        {toggle}
      </div>

      {view === "table" ? (
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-[13px] text-ink-2">
                <th className="text-left font-semibold py-2 pr-3">Fecha</th>
                {series.map((s) => (
                  <th key={s.name} className="text-right font-semibold py-2 px-2">
                    {s.name}
                  </th>
                ))}
                {series.length > 1 && (
                  <th className="text-right font-semibold py-2 pl-2">Total</th>
                )}
              </tr>
            </thead>
            <tbody>
              {columns.map((c, i) => (
                <tr key={c.longLabel} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-ink-2 first-letter:uppercase">
                    {c.longLabel}
                  </td>
                  {c.values.map((v, j) => (
                    <td
                      key={j}
                      className="py-1.5 px-2 text-right tabular-nums text-ink"
                    >
                      {format(v)}
                    </td>
                  ))}
                  {series.length > 1 && (
                    <td className="py-1.5 pl-2 text-right tabular-nums font-medium text-ink">
                      {format(totals[i])}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : empty ? (
        <div
          className="flex items-center justify-center text-sm text-ink-3"
          style={{ height: PLOT_HEIGHT + 24 }}
        >
          {emptyText}
        </div>
      ) : (
        <figure className="m-0" aria-label={title}>
          <div className="flex gap-2">
            {/* Eje Y */}
            <div
              className="relative shrink-0 text-[11px] text-ink-3 tabular-nums text-right"
              style={{ height: PLOT_HEIGHT, minWidth: 28 }}
              aria-hidden="true"
            >
              {ticks.map((t, i) => (
                <span
                  key={t}
                  className="absolute right-0 -translate-y-1/2 whitespace-nowrap"
                  style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
                >
                  {format(t)}
                </span>
              ))}
            </div>

            <div className="relative flex-1 min-w-0">
              {/* Rejilla: líneas finas, sólidas, discretas */}
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{ height: PLOT_HEIGHT }}
                aria-hidden="true"
              >
                {ticks.map((t, i) => (
                  <div
                    key={t}
                    className={`absolute inset-x-0 h-px ${i === ticks.length - 1 ? "bg-line-strong" : "bg-line"}`}
                    style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
                  />
                ))}
              </div>

              {/* Columnas */}
              <div
                className="relative flex items-end"
                style={{ height: PLOT_HEIGHT }}
              >
                {columns.map((c, i) => {
                  const isActive = active === i;
                  return (
                    <div
                      key={c.longLabel}
                      role="img"
                      tabIndex={0}
                      aria-label={`${c.longLabel}: ${series
                        .map((s, j) => `${s.name} ${format(c.values[j])}`)
                        .join(", ")}`}
                      aria-describedby={isActive ? tooltipId : undefined}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className={`flex-1 h-full flex flex-col justify-end items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus ${
                        isActive ? "bg-primary-soft/60" : ""
                      }`}
                    >
                      <div
                        className="flex flex-col-reverse gap-0.5"
                        style={{ width: "min(24px, 70%)" }}
                      >
                        {series.map((s, j) => {
                          const v = c.values[j];
                          if (v <= 0) return null;
                          return (
                            <div
                              key={s.name}
                              className="w-full last:rounded-t-sm"
                              style={{
                                height: Math.max(
                                  2,
                                  (v / max) * PLOT_HEIGHT - 2,
                                ),
                                backgroundColor: s.color,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tooltip: el valor manda, la serie acompaña */}
              {active != null && (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none bg-surface rounded-xl shadow-lg px-3 py-2 min-w-36"
                  style={{
                    top: 0,
                    left: `clamp(72px, ${((active + 0.5) / columns.length) * 100}%, calc(100% - 72px))`,
                  }}
                >
                  <p className="text-xs text-ink-3 mb-1 first-letter:uppercase whitespace-nowrap">
                    {columns[active].longLabel}
                  </p>
                  {series.map((s, j) => (
                    <p
                      key={s.name}
                      className="flex items-center gap-2 text-xs whitespace-nowrap"
                    >
                      <span
                        className="w-3 h-0.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-ink tabular-nums">
                        {format(columns[active].values[j])}
                      </span>
                      <span className="text-ink-3">{s.name}</span>
                    </p>
                  ))}
                  {series.length > 1 && (
                    <p className="text-xs text-ink-2 mt-1 pt-1 border-t border-line tabular-nums">
                      Total {format(totals[active])}
                    </p>
                  )}
                </div>
              )}

              {/* Eje X */}
              <div className="flex mt-1.5" aria-hidden="true">
                {columns.map((c, i) => (
                  <span
                    key={c.longLabel}
                    className="flex-1 text-center text-[11px] text-ink-3 whitespace-nowrap overflow-visible"
                  >
                    {i % every === 0 ? c.label : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </figure>
      )}
    </div>
  );
}
