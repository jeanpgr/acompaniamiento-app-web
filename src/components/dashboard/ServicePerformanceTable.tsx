import { Star } from "lucide-react";
import type { ServicePerformance } from "@/api/dashboard";
import { KIND_META, formatInt, formatMoney } from "./format";

const pct = new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1 });

/** % de pagos confirmados como medidor: pista y relleno del mismo tono. */
function RateMeter({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex items-center gap-2 justify-end">
      <div
        className="w-20 h-1.5 rounded-full bg-primary-soft overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-brand-mark"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="tabular-nums w-12 text-right">
        {pct.format(value)} %
      </span>
    </div>
  );
}

/**
 * Rendimiento de cada servicio en el periodo. Es una tabla (no un gráfico):
 * son varias medidas por fila y el administrador las compara leyendo.
 */
export default function ServicePerformanceTable({
  rows,
  overallRate,
}: {
  rows: ServicePerformance[];
  /** % de confirmación de todos los servicios (el mismo del indicador). */
  overallRate: number | null;
}) {
  const total = rows.reduce(
    (t, r) => ({
      requests: t.requests + r.requests,
      paid: t.paid + r.paid,
      cancelled: t.cancelled + r.cancelled,
      forgotten: t.forgotten + r.forgotten,
      revenue: t.revenue + r.revenue,
    }),
    { requests: 0, paid: 0, cancelled: 0, forgotten: 0, revenue: 0 },
  );

  const th = "text-right font-semibold py-2 px-3 whitespace-nowrap";
  const td = "py-2.5 px-3 text-right tabular-nums text-ink";

  /** Medidas de una fila, como pares etiqueta/valor (vista de tarjetas). */
  const metrics = (r: {
    requests: number;
    paid: number;
    cancelled: number;
    forgotten: number;
    revenue: number;
  }) => [
    ["Solicitudes", formatInt(r.requests)],
    ["Pagadas", formatInt(r.paid)],
    ["Canceladas", formatInt(r.cancelled)],
    ["No asistidas", formatInt(r.forgotten)],
    ["Ingresos", formatMoney(r.revenue)],
  ];

  return (
    <>
      {/* Bajo xl: una tarjeta por servicio (8 columnas no caben) */}
      <ul role="list" className="xl:hidden grid gap-3 sm:grid-cols-2">
        {[
          ...rows.map((r) => ({
            key: r.kind,
            label: KIND_META[r.kind].label,
            color: KIND_META[r.kind].color as string | null,
            rate: r.confirmationRate,
            rating: r.rating,
            ratingCount: r.ratingCount,
            values: metrics(r),
          })),
          {
            key: "total",
            label: "Total",
            color: null,
            rate: overallRate,
            rating: null,
            ratingCount: 0,
            values: metrics(total),
          },
        ].map((c) => (
          <li
            key={c.key}
            className={`rounded-xl p-4 min-w-0 ${c.color ? "bg-surface-2" : "bg-surface-2 ring-1 ring-line-strong"}`}
          >
            <p className="flex items-center gap-2 font-bold text-ink mb-2">
              {c.color && (
                <span
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ backgroundColor: c.color }}
                  aria-hidden="true"
                />
              )}
              {c.label}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {c.values.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 min-w-0">
                  <dt className="text-ink-3 truncate">{label}</dt>
                  <dd className="font-semibold text-ink tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
              {c.rating != null && (
                <div className="col-span-2 flex justify-between gap-2 min-w-0">
                  <dt className="text-ink-3">Calificación</dt>
                  <dd className="inline-flex items-center gap-1 font-semibold text-ink tabular-nums">
                    <Star
                      size={14}
                      className="fill-warning text-warning"
                      aria-hidden="true"
                    />
                    {pct.format(c.rating)}
                    <span className="text-ink-3 text-xs font-normal">
                      ({c.ratingCount})
                    </span>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3 text-sm">
              <span className="text-ink-3">Confirmación de pago</span>
              <RateMeter value={c.rate} />
            </div>
          </li>
        ))}
      </ul>

    <div className="hidden xl:block overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-[13px] text-ink-2">
            <th className="text-left font-semibold py-2 pr-3">Servicio</th>
            <th className={th}>Solicitudes</th>
            <th className={th}>Pagadas</th>
            <th className={th}>Confirmación de pago</th>
            <th className={th}>Canceladas</th>
            <th className={th}>No asistidas</th>
            <th className={th}>Ingresos</th>
            <th className={`${th} pr-0`}>Calificación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kind} className="border-b border-line/60">
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2 text-ink font-medium whitespace-nowrap">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px]"
                    style={{ backgroundColor: KIND_META[r.kind].color }}
                    aria-hidden="true"
                  />
                  {KIND_META[r.kind].label}
                </span>
              </td>
              <td className={td}>{formatInt(r.requests)}</td>
              <td className={td}>{formatInt(r.paid)}</td>
              <td className={td}>
                <RateMeter value={r.confirmationRate} />
              </td>
              <td className={td}>{formatInt(r.cancelled)}</td>
              <td className={td}>{formatInt(r.forgotten)}</td>
              <td className={td}>{formatMoney(r.revenue)}</td>
              <td className={`${td} pr-0`}>
                {r.rating == null ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Star
                      size={15}
                      className="fill-warning text-warning"
                      aria-hidden="true"
                    />
                    {pct.format(r.rating)}
                    <span className="text-ink-3 text-xs">
                      ({r.ratingCount})
                    </span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-ink font-semibold">
            <td className="py-2.5 pr-3">Total</td>
            <td className={td}>{formatInt(total.requests)}</td>
            <td className={td}>{formatInt(total.paid)}</td>
            <td className={td}>
              <RateMeter value={overallRate} />
            </td>
            <td className={td}>{formatInt(total.cancelled)}</td>
            <td className={td}>{formatInt(total.forgotten)}</td>
            <td className={td}>{formatMoney(total.revenue)}</td>
            <td className={`${td} pr-0`} />
          </tr>
        </tfoot>
      </table>
    </div>
    </>
  );
}
