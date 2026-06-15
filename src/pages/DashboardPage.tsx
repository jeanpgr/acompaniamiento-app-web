import { useQuery } from "@tanstack/react-query";
import { Briefcase, Star, Clock, Truck } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import { getReviews } from "@/api/reviews";
import { getServices } from "@/api/services";
import { getSchedulesAcompan } from "@/api/schedules";

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function ReviewsChart({
  reviews,
}: {
  reviews: { grade: number; created_at: string }[];
}) {
  const weekMap: Record<string, number[]> = {};
  reviews.forEach((r) => {
    const key = getISOWeek(new Date(r.created_at));
    if (!weekMap[key]) weekMap[key] = [];
    weekMap[key].push(r.grade);
  });

  const weekly = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, grades]) => ({
      label: key.replace(/\d{4}-/, ""),
      value: grades.reduce((s, g) => s + g, 0) / grades.length,
    }));

  if (weekly.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
        Sin datos de calificaciones aún
      </div>
    );
  }

  const MAX_VAL = 5;
  return (
    <div className="flex items-end gap-3 h-44 px-2">
      {weekly.map(({ label, value }, i) => {
        const isLast = i === weekly.length - 1;
        const height = (value / MAX_VAL) * 100;
        return (
          <div key={label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-slate-500">{value.toFixed(1)}</span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: `${height}%`,
                backgroundColor: isLast ? "#1D3461" : "#BFCFE7",
                minHeight: 8,
              }}
            />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: getReviews,
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules-acompan"],
    queryFn: getSchedulesAcompan,
  });

  const avgGrade =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.grade, 0) / reviews.length).toFixed(1)
      : "—";

  const pending = schedules.filter((s) => s.status === "PENDIENTE").length;
  const inRoute = schedules.filter((s) => s.status === "EN CURSO").length;
  const completed = schedules.filter((s) => s.status === "COMPLETADO").length;

  const gradeDistribution = [5, 4, 3, 2, 1].map((g) => ({
    stars: g,
    count: reviews.filter((r) => r.grade === g).length,
  }));
  const maxCount = Math.max(...gradeDistribution.map((g) => g.count), 1);
  const recentReviews = reviews.slice(0, 3);

  const typeCount = (type: string) =>
    services.filter((s) => s.type === type).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Métricas y satisfacción
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analiza resultados, tendencias y encuestas de satisfacción
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Briefcase}
          iconBg="#DBEAFE"
          iconColor="#1D4ED8"
          value={services.filter((s) => s.active).length}
          label="Servicios activos"
        />
        <StatCard
          icon={Clock}
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          value={pending}
          label="Pendientes"
        />
        <StatCard
          icon={Truck}
          iconBg="#D1FAE5"
          iconColor="#22C55E"
          value={inRoute}
          label="En ruta"
        />
        <StatCard
          icon={Star}
          iconBg="#FEF9C3"
          iconColor="#D97706"
          value={avgGrade}
          label="Calificación promedio"
        />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Calificación semanal */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Calificación semanal promedio
          </h2>
          <ReviewsChart reviews={reviews} />
        </div>

        {/* Servicios por tipo */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Servicios por tipo
          </h2>
          <div className="space-y-3">
            {[
              {
                key: "ACOMPAÑAMIENTO",
                label: "Acompañamiento",
                color: "#3B82F6",
              },
              { key: "TURISMO", label: "Turismo", color: "#22C55E" },
              { key: "CAPACITACION", label: "Capacitación", color: "#F59E0B" },
              { key: "GUARDERIA", label: "Guardería", color: "#EC4899" },
            ].map(({ key, label, color }) => {
              const count = typeCount(key);
              const pct =
                services.length > 0 ? (count / services.length) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
            {services.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">
                Sin servicios registrados
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Distribución de notas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Distribución de calificaciones
          </h2>
          <div className="space-y-2">
            {gradeDistribution.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{stars}★</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-4 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reseñas recientes */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Reseñas recientes
          </h2>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Sin reseñas registradas aún
            </p>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Star size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">
                        {"★".repeat(r.grade)}
                        {"☆".repeat(5 - r.grade)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {r.comment}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen de agendamientos */}
      {schedules.length > 0 && (
        <div className="mt-5 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Resumen de agendamientos (Acompañamiento)
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Pendientes", value: pending, color: "#F59E0B" },
              { label: "En ruta", value: inRoute, color: "#3B82F6" },
              { label: "Completados", value: completed, color: "#22C55E" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-lg p-4"
                style={{ backgroundColor: color + "18" }}
              >
                <p className="text-2xl font-bold" style={{ color }}>
                  {value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
