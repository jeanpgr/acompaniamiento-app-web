import { Star } from "lucide-react";
import type { DashboardData } from "@/api/dashboard";
import { serviceTypeStyle } from "@/lib/serviceTypes";

const dec1 = new Intl.NumberFormat("es-EC", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function Stars({ grade, size = 13 }: { grade: number; size?: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${grade} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={
            n <= Math.round(grade)
              ? "fill-warning text-warning"
              : "text-line-strong"
          }
        />
      ))}
    </span>
  );
}

/** Satisfacción: promedio del periodo, reparto por nota y últimas reseñas. */
export default function RatingsPanel({
  rating,
  distribution,
  recent,
}: {
  rating: DashboardData["kpis"]["rating"];
  distribution: number[];
  recent: DashboardData["recentReviews"];
}) {
  const maxCount = Math.max(1, ...distribution);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_1fr] gap-6">
      <div>
        {rating.current == null ? (
          <p className="text-sm text-ink-3">Sin calificaciones en el periodo</p>
        ) : (
          <div className="flex items-end gap-3 mb-4">
            <p className="text-4xl font-semibold text-ink leading-none">
              {dec1.format(rating.current)}
            </p>
            <div>
              <Stars grade={rating.current} size={15} />
              <p className="text-xs text-ink-3 mt-1">
                {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
              </p>
            </div>
          </div>
        )}
        {/* Barras horizontales: una sola serie, un solo color */}
        <ul className="space-y-1.5" aria-label="Reseñas del periodo por nota">
          {[5, 4, 3, 2, 1].map((g) => {
            const count = distribution[g - 1] ?? 0;
            return (
              <li key={g} className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-0.5 w-7 text-ink-2 tabular-nums">
                  {g}
                  <Star
                    size={11}
                    className="fill-warning text-warning"
                    aria-hidden="true"
                  />
                </span>
                <span
                  className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-brand-mark"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right text-ink-2 tabular-nums">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-medium text-ink-3 mb-2">Últimas reseñas</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-3 py-6 text-center">
            Aún no hay reseñas
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => {
              const st = serviceTypeStyle(r.serviceType);
              return (
                <li key={r.id} className="p-3 rounded-lg bg-surface-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Stars grade={r.grade} />
                    {r.serviceName && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.badge}`}
                      >
                        {r.serviceName}
                      </span>
                    )}
                    <span className="text-xs text-ink-3 ml-auto">
                      {new Date(r.createdAt).toLocaleDateString("es-EC", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-ink-2 line-clamp-2">{r.comment}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
