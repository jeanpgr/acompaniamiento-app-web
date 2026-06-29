import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Car } from "lucide-react";
import {
  getSchedulesAcompan,
  getSchedulesTourism,
  getSchedulesTraining,
  getSchedulesDaycare,
  updateScheduleAcompan,
  updateScheduleTourism,
  updateScheduleTraining,
  updateScheduleDaycare,
  type ScheduleAcompan,
  type ScheduleTourism,
  type ScheduleTraining,
  type ScheduleDaycare,
  type ScheduleStatus,
} from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";

// ── Tipos y helpers ────────────────────────────────────────────────────────────

type OriginalType = "acompan" | "tourism" | "training" | "daycare";

interface Unified {
  id: string;
  originalType: OriginalType;
  serviceType: string;           // para badge de color
  title: string;                 // nombre del servicio / viaje / tema
  personName: string;            // persona que agenda
  dateTime: string;              // fecha de referencia
  status: ScheduleStatus | null;
  address?: string;
  needsVehicle: boolean;         // CAPACITACION no necesita vehículo
  vehicleId?: string;
}

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ACOMPAÑAMIENTO: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD", label: "Acompañamiento" },
  TURISMO:        { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7", label: "Turismo" },
  CAPACITACION:   { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5", label: "Capacitación" },
  GUARDERIA:      { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047", label: "Guardería" },
  default:        { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", label: "Servicio" },
};

function normalizeAcompan(s: ScheduleAcompan): Unified {
  return {
    id: s.id, originalType: "acompan",
    serviceType: s.service?.type ?? "ACOMPAÑAMIENTO",
    title: s.service?.name ?? "Acompañamiento",
    personName: s.reference,
    dateTime: s.date_time,
    status: s.status,
    address: s.origin_address,
    needsVehicle: true,
    vehicleId: s.id_vehicle,
  };
}
function normalizeTourism(s: ScheduleTourism): Unified {
  const names = Array.isArray(s.names_persons)
    ? s.names_persons.join(", ")
    : s.phone_responsible;
  return {
    id: s.id, originalType: "tourism",
    serviceType: "TURISMO",
    title: s.detail?.name ?? "Turismo",
    personName: names,
    dateTime: s.detail?.date_output ?? s.created_at,
    status: s.status,
    needsVehicle: true,
    vehicleId: s.id_vehicle,
  };
}
function normalizeTraining(s: ScheduleTraining): Unified {
  return {
    id: s.id, originalType: "training",
    serviceType: "CAPACITACION",
    title: s.detail?.topic ?? "Capacitación",
    personName: [s.name, s.lastname].filter(Boolean).join(" "),
    dateTime: s.detail?.date_time ?? s.created_at,
    status: s.status,
    needsVehicle: false,
  };
}
function normalizeDaycare(s: ScheduleDaycare): Unified {
  return {
    id: s.id, originalType: "daycare",
    serviceType: "GUARDERIA",
    title: "Guardería Adulto Mayor",
    personName: [s.name, s.lastname].filter(Boolean).join(" ") || "—",
    dateTime: s.created_at,
    status: s.status,
    address: s.address_pick_home ?? undefined,
    needsVehicle: true,
    vehicleId: s.id_vehicle,
  };
}

// ── Calendario ─────────────────────────────────────────────────────────────────

const DAYS = ["Lun", "Mar", "Miérc", "Jue", "Vie", "Sáb", "Dom"];

function getWeekRange(base: Date) {
  const d = new Date(base);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(new Date(d).setDate(diff));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}

function formatRange(mon: Date, sun: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${mon.toLocaleDateString("es-CO", opts)} — ${sun.toLocaleDateString("es-CO", opts)}`;
}

// ── Filtros de tipo ────────────────────────────────────────────────────────────

type FilterTab = "todos" | OriginalType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "todos",     label: "Todos" },
  { key: "acompan",  label: "Acompañamiento" },
  { key: "tourism",  label: "Turismo" },
  { key: "training", label: "Capacitación" },
  { key: "daycare",  label: "Guardería" },
];

// ── Componente principal ───────────────────────────────────────────────────────

export default function DistributionPage() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const qc = useQueryClient();

  // Cargar los 4 tipos de agendamiento
  const { data: acompanRaw = [], isLoading: l1 } = useQuery({ queryKey: ["schedules-acompan"],  queryFn: getSchedulesAcompan });
  const { data: tourismRaw  = [], isLoading: l2 } = useQuery({ queryKey: ["schedules-tourism"], queryFn: getSchedulesTourism });
  const { data: trainingRaw = [], isLoading: l3 } = useQuery({ queryKey: ["schedules-training"],queryFn: getSchedulesTraining });
  const { data: daycareRaw  = [], isLoading: l4 } = useQuery({ queryKey: ["schedules-daycare"], queryFn: getSchedulesDaycare });
  const { data: vehicles    = [] }                 = useQuery({ queryKey: ["vehicles"],          queryFn: getVehicles });

  const isLoading = l1 || l2 || l3 || l4;

  // Normalizar a estructura unificada
  const allSchedules: Unified[] = [
    ...acompanRaw.map(normalizeAcompan),
    ...tourismRaw.map(normalizeTourism),
    ...trainingRaw.map(normalizeTraining),
    ...daycareRaw.map(normalizeDaycare),
  ].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  // Aplicar filtro de tab
  const filtered = activeTab === "todos"
    ? allSchedules
    : allSchedules.filter((s) => s.originalType === activeTab);

  // Semana actual
  const { mon, sun } = getWeekRange(baseDate);
  const weekStart = new Date(mon); weekStart.setHours(0, 0, 0, 0);
  const weekEnd   = new Date(sun); weekEnd.setHours(23, 59, 59, 999);

  const byDay: Record<number, Unified[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  filtered.forEach((s) => {
    const d = new Date(s.dateTime);
    if (d >= weekStart && d <= weekEnd) {
      const wd = d.getDay();
      const idx = wd === 0 ? 6 : wd - 1;
      byDay[idx].push(s);
    }
  });

  const pending = filtered.filter((s) => !s.status || s.status === "PENDIENTE");

  // ── Mutaciones de asignación ────────────────────────────────────────────────

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["schedules-acompan"] });
    qc.invalidateQueries({ queryKey: ["schedules-tourism"] });
    qc.invalidateQueries({ queryKey: ["schedules-training"] });
    qc.invalidateQueries({ queryKey: ["schedules-daycare"] });
    setAssigningId(null);
  }

  const acompanMut  = useMutation({ mutationFn: ({ id, vid }: { id: string; vid: string }) => updateScheduleAcompan(id,  { id_vehicle: vid, status: "EN CURSO" }), onSuccess: invalidateAll });
  const tourismMut  = useMutation({ mutationFn: ({ id, vid }: { id: string; vid: string }) => updateScheduleTourism(id,  { id_vehicle: vid, status: "EN CURSO" }), onSuccess: invalidateAll });
  const daycareMut  = useMutation({ mutationFn: ({ id, vid }: { id: string; vid: string }) => updateScheduleDaycare(id,  { id_vehicle: vid, status: "EN CURSO" }), onSuccess: invalidateAll });
  const trainingMut = useMutation({ mutationFn: ({ id }: { id: string })                   => updateScheduleTraining(id, { status: "EN CURSO" }),                   onSuccess: invalidateAll });

  function handleAssign(s: Unified, vehicleId: string) {
    if (!vehicleId) return;
    switch (s.originalType) {
      case "acompan":  acompanMut.mutate({ id: s.id, vid: vehicleId }); break;
      case "tourism":  tourismMut.mutate({ id: s.id, vid: vehicleId }); break;
      case "daycare":  daycareMut.mutate({ id: s.id, vid: vehicleId }); break;
      case "training": trainingMut.mutate({ id: s.id }); break;
    }
  }

  const anyMutating = acompanMut.isPending || tourismMut.isPending || daycareMut.isPending || trainingMut.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Panel de distribución</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Agendamientos de todos los servicios · Asigna vehículo y confirma
          </p>
        </div>
        {/* Contador global */}
        <div className="flex gap-2 text-xs">
          {(["ACOMPAÑAMIENTO","TURISMO","CAPACITACION","GUARDERIA"] as const).map((t) => {
            const count = allSchedules.filter((s) => s.serviceType === t && (!s.status || s.status === "PENDIENTE")).length;
            if (!count) return null;
            const st = TYPE_STYLE[t];
            return (
              <span key={t} className="px-2 py-1 rounded-full font-medium" style={{ backgroundColor: st.bg, color: st.text }}>
                {st.label} · {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-1 mb-4 border-b border-slate-100 pb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            {tab.key !== "todos" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({allSchedules.filter((s) =>
                  tab.key === "todos" ? true : s.originalType === tab.key
                ).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* ── CALENDARIO SEMANAL ── */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Controles */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-700 text-sm">{formatRange(mon, sun)}</span>
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setBaseDate(new Date())} className="px-3 py-1 rounded-lg text-sm text-white font-medium ml-1" style={{ backgroundColor: "#1D3461" }}>
              Hoy
            </button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((day, i) => {
              const date = new Date(mon);
              date.setDate(mon.getDate() + i);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={day} className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-slate-100 ${isToday ? "text-blue-700 bg-blue-50" : "text-slate-500"}`}>
                  {day} {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* Cuerpo */}
          <div className="grid grid-cols-7 min-h-64">
            {isLoading ? (
              <div className="col-span-7 py-12 text-center text-slate-400 text-sm">Cargando agendamientos…</div>
            ) : (
              DAYS.map((_, i) => (
                <div key={i} className="border-r last:border-r-0 border-slate-100 p-1.5 space-y-1.5">
                  {byDay[i].map((item) => {
                    const st = TYPE_STYLE[item.serviceType] ?? TYPE_STYLE.default;
                    return (
                      <div key={item.id} className="rounded-lg p-1.5 border-l-4 text-xs" style={{ backgroundColor: st.bg, borderLeftColor: st.border }}>
                        <p className="font-semibold truncate" style={{ color: st.text }}>{item.title}</p>
                        <p className="truncate mt-0.5" style={{ color: st.text, opacity: 0.75 }}>{item.personName}</p>
                        <p className="mt-0.5 font-medium" style={{ color: st.text, opacity: 0.6 }}>
                          {new Date(item.dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── PANEL SIN ASIGNAR ── */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="font-semibold text-slate-700 text-sm">
                Sin asignar ({pending.length})
              </span>
            </div>

            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {pending.length === 0 && !isLoading && (
                <p className="text-xs text-slate-400 text-center py-6">Sin agendamientos pendientes</p>
              )}

              {pending.map((s) => {
                const st = TYPE_STYLE[s.serviceType] ?? TYPE_STYLE.default;
                const isAssigning = assigningId === s.id;
                const isMutating = anyMutating && isAssigning;

                return (
                  <div key={`${s.originalType}-${s.id}`} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {/* Badge tipo */}
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1.5" style={{ backgroundColor: st.bg, color: st.text }}>
                      {st.label}
                    </span>

                    {/* Título */}
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{s.title}</p>

                    {/* Meta */}
                    <div className="mt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User size={10} />
                        <span className="truncate">{s.personName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={10} />
                        <span>
                          {new Date(s.dateTime).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                          {" · "}
                          {new Date(s.dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {s.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin size={10} />
                          <span className="truncate">{s.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Acción */}
                    {isAssigning ? (
                      <div className="mt-2.5 space-y-2">
                        {s.needsVehicle ? (
                          <>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                              <Car size={11} />
                              <span className="font-medium">Asignar vehículo</span>
                            </div>
                            <select
                              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                              defaultValue=""
                              disabled={isMutating}
                              onChange={(e) => {
                                if (e.target.value) handleAssign(s, e.target.value);
                              }}
                            >
                              <option value="" disabled>Seleccionar vehículo…</option>
                              {vehicles.filter((v) => v.active).map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} — {v.license_plate}
                                  {v.capacity ? ` (${v.capacity} pax)` : ""}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            Capacitación en línea — no requiere vehículo
                          </p>
                        )}

                        <div className="flex gap-2">
                          {!s.needsVehicle && (
                            <button
                              onClick={() => handleAssign(s, "")}
                              disabled={isMutating}
                              className="flex-1 py-1.5 rounded-lg text-xs text-white font-medium disabled:opacity-50"
                              style={{ backgroundColor: "#1D3461" }}
                            >
                              {isMutating ? "Confirmando…" : "Confirmar inscripción"}
                            </button>
                          )}
                          <button
                            onClick={() => setAssigningId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-200 border border-slate-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningId(s.id)}
                        className="mt-2.5 w-full py-1.5 rounded-lg text-xs text-white font-medium transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#1D3461" }}
                      >
                        Asignar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-3 bg-white rounded-xl shadow-sm border border-slate-100 p-3">
            <p className="text-xs font-medium text-slate-500 mb-2">Tipos de servicio</p>
            <div className="space-y-1.5">
              {Object.entries(TYPE_STYLE).filter(([k]) => k !== "default").map(([key, st]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: st.border }} />
                  <span className="text-xs text-slate-600">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
