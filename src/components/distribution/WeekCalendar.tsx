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

/** "5 – 11 oct 2026" (o "29 sept – 5 oct 2026" si cambia de mes). */
function formatRange(mon: Date, sun: Date) {
  const sameMonth = mon.getMonth() === sun.getMonth();
  const from = mon.toLocaleDateString(
    "es-CO",
    sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" },
  );
  const to = sun.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${from} – ${to}`;
}

/** Tarjeta de una cita dentro del calendario o de la agenda. */
function EventCard({ item, wide }: { item: Unified; wide?: boolean }) {
  const st = serviceTypeStyle(item.serviceType);
  return (
    <div className={`rounded-lg p-1.5 text-xs min-w-0 ${wide ? "p-2.5 text-sm" : ""} ${st.tint}`}>
      <p className="flex items-center gap-1.5 font-semibold min-w-0">
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`}
        />
        <span className="truncate">{item.title}</span>
        {wide && (
          <span className="ml-auto shrink-0 font-semibold tabular-nums">
            {formatTime(item.dateTime)}
          </span>
        )}
      </p>
      <p className="truncate mt-0.5">{item.personName}</p>
      {!wide && (
        <p className="mt-0.5 font-medium tabular-nums">
          {formatTime(item.dateTime)}
        </p>
      )}
      {item.status && item.status !== "PENDIENTE" && (
        <p className="mt-0.5 text-[11px] font-bold opacity-85">
          {statusLabelOf(item)}
        </p>
      )}
    </div>
  );
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
    <div className="flex-1 min-w-0 card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-3 border-b border-line">
        <button
          type="button"
          onClick={() => moveWeek(-1)}
          aria-label="Semana anterior"
          className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-primary-soft text-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <span
          className="font-bold text-ink text-base min-w-0 text-center sm:text-left"
          aria-live="polite"
        >
          {formatRange(mon, sun)}
        </span>
        <button
          type="button"
          onClick={() => moveWeek(1)}
          aria-label="Semana siguiente"
          className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-primary-soft text-primary"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setBaseDate(new Date())}
          className="px-4 min-h-9 rounded-lg text-sm font-semibold ml-auto bg-primary text-white shadow-raised hover:bg-primary-hover transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Celular: agenda día por día (7 columnas no caben) */}
      <ol className="md:hidden divide-y divide-line">
        {DAYS.map((day, i) => {
          const date = new Date(mon);
          date.setDate(mon.getDate() + i);
          const isToday = date.toDateString() === today;
          const dayItems = byDay[i];
          return (
            <li key={day} className="flex gap-3 px-3 py-2.5">
              <div
                className={`w-12 shrink-0 self-start rounded-lg py-1 text-center ${isToday ? "bg-primary text-white" : "bg-surface-2 text-ink-2"}`}
              >
                <p className="text-xs font-semibold">{day}</p>
                <p className="text-lg font-bold leading-tight">
                  {date.getDate()}
                </p>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5 self-center">
                {isLoading ? (
                  <div className="skeleton h-10" aria-hidden="true" />
                ) : dayItems.length === 0 ? (
                  <p className="text-sm text-ink-3">Sin citas</p>
                ) : (
                  dayItems.map((item) => (
                    <EventCard
                      key={`${item.originalType}-${item.id}`}
                      item={item}
                      wide
                    />
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Cabecera de días */}
      <div className="hidden md:grid grid-cols-7 border-b border-line">
        {DAYS.map((day, i) => {
          const date = new Date(mon);
          date.setDate(mon.getDate() + i);
          const isToday = date.toDateString() === today;
          return (
            <div
              key={day}
              className={`px-1 py-2.5 text-center text-[13px] font-semibold border-r last:border-r-0 border-line truncate ${isToday ? "text-white bg-primary" : "text-ink-2 bg-surface-2"}`}
            >
              {day} {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="hidden md:grid grid-cols-7 min-h-64">
        {isLoading ? (
          <div role="status" className="col-span-7 grid grid-cols-7">
            <span className="sr-only">Cargando agendamientos…</span>
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="border-r last:border-r-0 border-line p-1.5 space-y-1.5 min-w-0"
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
              className="border-r last:border-r-0 border-line p-1.5 space-y-1.5 min-w-0"
            >
              {dayItems.map((item) => (
                <EventCard key={`${item.originalType}-${item.id}`} item={item} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
