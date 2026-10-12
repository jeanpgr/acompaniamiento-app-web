import { Link } from "react-router-dom";
import type { DashboardData } from "@/api/dashboard";
import { formatInt, formatMoney } from "./format";

/**
 * Productos más vendidos del periodo, por unidades. Barras horizontales de
 * una sola serie (un color); el monto es de lista, antes de cupones.
 */
export default function TopProducts({
  products,
}: {
  products: DashboardData["topProducts"];
}) {
  if (products.length === 0)
    return (
      <p className="text-sm text-ink-3 py-6 text-center">
        Sin ventas en el periodo
      </p>
    );
  const max = Math.max(...products.map((p) => p.quantity));
  return (
    <div>
      <ol className="space-y-3">
        {products.map((p, i) => (
          <li key={p.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink truncate">
                <span className="text-ink-3 tabular-nums mr-1.5">{i + 1}.</span>
                {p.name}
              </span>
              <span className="shrink-0 text-ink-2 tabular-nums">
                <span className="font-semibold text-ink">
                  {formatInt(p.quantity)}
                </span>{" "}
                u. · {formatMoney(p.revenue)}
              </span>
            </div>
            <div
              className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(p.quantity / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-3 mt-3">
        Montos a precio de lista, antes de cupones.{" "}
        <Link to="/sales" className="text-primary hover:underline">
          Ver ventas
        </Link>
      </p>
    </div>
  );
}
