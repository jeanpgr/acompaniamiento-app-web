import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import { statusLabelOf, formatTime, type Unified } from "./schedules";

const DAYS = ["Lun", "Mar", "Miérc", "Jue", "Vie", "Sáb", "Dom"];

/** Lunes y domingo de la semana de `base`. */
function getWeekRange(base: Date) {
  const day = base.getDay();
  const mon = new Date(base);
  mon.setDate(base.getDate() - day + (day === 0 ? -6 : 1));
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
}

function formatRange(mon: Date, sun: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${mon.toLocaleDateString("es-CO", opts)} — ${sun.toLocaleDateString("es-CO", opts)}`;
}

/** Citas de la semana agrupadas por día (0 = lunes … 6 = domingo). */
function groupByDay(items: Unified[], mon: Date, sun: Date) {
  const byDay: Unified[][] = DAYS.map(() => []);
  for (const s of items) {
    const d = new Date(s.dateTime);
    if (d >= mon && d <= sun) byDay[(d.getDay() + 6) % 7].push(s);
  }
  return byDay;
}

interface Props {
  items: Unified[];
  isLoading: boolean;
}

/** Calendario semanal de citas; la semana mostrada es estado propio. */
export default function WeekCalendar({ items, isLoading }: Props) {
  const [baseDate, setBaseDate] = useState(() => new Date());
  const { mon, sun } = getWeekRange(baseDate);
  const byDay = groupByDay(items, mon, sun);
  const today = new Date().toDateString();

  const moveWeek = (weeks: number) =>
    setBaseDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + weeks * 7);
      return next;
    });

  return (
    <div className="flex-1 min-w-0 bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
        <button
          type="button"
          onClick={() => moveWeek(-1)}
          aria-label="Semana anterior"
          className="p-1.5 rounded-lg hover:bg-line text-ink-3"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-ink text-sm" aria-live="polite">
          {formatRange(mon, sun)}
        </span>
        <button
          type="button"
          onClick={() => moveWeek(1)}
          aria-label="Semana siguiente"
          className="p-1.5 rounded-lg hover:bg-line text-ink-3"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setBaseDate(new Date())}
          className="px-3 py-1 rounded-lg text-sm font-medium ml-1 bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 min-w-180 border-b border-line">
        {DAYS.map((day, i) => {
          const date = new Date(mon);
          date.setDate(mon.getDate() + i);
          const isToday = date.toDateString() === today;
          return (
            <div
              key={day}
              className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-line ${isToday ? "text-info-fg bg-info-bg font-semibold" : "text-ink-3"}`}
            >
              {day} {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 min-w-180 min-h-64">
        {isLoading ? (
          <div role="status" className="col-span-7 grid grid-cols-7">
            <span className="sr-only">Cargando agendamientos…</span>
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="border-r last:border-r-0 border-line p-1.5 space-y-1.5"
                aria-hidden="true"
              >
                <div className="skeleton h-14" />
                {i % 2 === 0 && <div className="skeleton h-14" />}
              </div>
            ))}
          </div>
        ) : (
          byDay.map((dayItems, i) => (
            <div
              key={DAYS[i]}
              className="border-r last:border-r-0 border-line p-1.5 space-y-1.5"
            >
              {dayItems.map((item) => {
                const st = serviceTypeStyle(item.serviceType);
                return (
                  <div
                    key={`${item.originalType}-${item.id}`}
                    className={`rounded-lg p-1.5 text-xs ${st.tint}`}
                  >
                    <p className="flex items-center gap-1.5 font-semibold">
                      <span
                        aria-hidden="true"
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`}
                      />
                      <span className="truncate">{item.title}</span>
                    </p>
                    <p className="truncate mt-0.5">{item.personName}</p>
                    <p className="mt-0.5 font-medium tabular-nums">
                      {formatTime(item.dateTime)}
                    </p>
                    {item.status && item.status !== "PENDIENTE" && (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        {statusLabelOf(item)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
