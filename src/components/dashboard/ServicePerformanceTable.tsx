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

  const th = "text-right font-medium py-2 px-3 whitespace-nowrap";
  const td = "py-2.5 px-3 text-right tabular-nums text-ink";
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-180 text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink-3">
            <th className="text-left font-medium py-2 pr-3">Servicio</th>
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
                      size={13}
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
  );
}
