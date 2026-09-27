import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Car, Landmark, CheckCircle } from "lucide-react";
import {
  getSchedulesAcompan,
  getSchedulesTourism,
  getSchedulesTraining,
  getSchedulesDaycare,
  updateScheduleAcompan,
  updateScheduleTourism,
  updateScheduleTraining,
  updateScheduleDaycare,
  markRefundCompleteAcompan,
  markRefundCompleteTourism,
  markRefundCompleteTraining,
  markRefundCompleteDaycare,
  type ScheduleAcompan,
  type ScheduleTourism,
  type ScheduleTraining,
  type ScheduleDaycare,
  type ScheduleStatus,
  type RefundStatus,
} from "@/api/schedules";
import { getVehicles } from "@/api/vehicles";
import { SERVICE_TYPE_STYLE, serviceTypeStyle } from "@/lib/serviceTypes";

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
  refundStatus: RefundStatus | null;
  refundBank: string | null;
  refundAccount: string | null;
  refundAccountType: string | null;
  refundHolderCedula: string | null;
}


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
    refundStatus: s.refund_status,
    refundBank: s.refund_bank_name,
    refundAccount: s.refund_bank_account,
    refundAccountType: s.refund_account_type,
    refundHolderCedula: s.refund_holder_cedula,
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
    refundStatus: s.refund_status,
    refundBank: s.refund_bank_name,
    refundAccount: s.refund_bank_account,
    refundAccountType: s.refund_account_type,
    refundHolderCedula: s.refund_holder_cedula,
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
    refundStatus: s.refund_status,
    refundBank: s.refund_bank_name,
    refundAccount: s.refund_bank_account,
    refundAccountType: s.refund_account_type,
    refundHolderCedula: s.refund_holder_cedula,
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
    refundStatus: s.refund_status,
    refundBank: s.refund_bank_name,
    refundAccount: s.refund_bank_account,
    refundAccountType: s.refund_account_type,
    refundHolderCedula: s.refund_holder_cedula,
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
  const cancelled = filtered.filter((s) => s.status === "CANCELADA");

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

  // ── Reembolsos de citas canceladas ──────────────────────────────────────────

  const refundMutByType: Record<OriginalType, (id: string) => Promise<unknown>> = {
    acompan: markRefundCompleteAcompan,
    tourism: markRefundCompleteTourism,
    training: markRefundCompleteTraining,
    daycare: markRefundCompleteDaycare,
  };
  const refundMut = useMutation({
    mutationFn: ({ s }: { s: Unified }) => refundMutByType[s.originalType](s.id),
    onSuccess: invalidateAll,
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">Panel de distribución</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Agendamientos de todos los servicios · Asigna vehículo y confirma
          </p>
        </div>
        {/* Contador global */}
        <div className="flex gap-2 text-xs">
          {(["ACOMPAÑAMIENTO","TURISMO","CAPACITACION","GUARDERIA"] as const).map((t) => {
            const count = allSchedules.filter((s) => s.serviceType === t && (!s.status || s.status === "PENDIENTE")).length;
            if (!count) return null;
            const st = serviceTypeStyle(t);
            return (
              <span key={t} className={`px-2 py-1 rounded-full font-medium ${st.badge}`}>
                {st.label} · {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tabs de filtro */}
      <div className="flex gap-1 mb-4 border-b border-line pb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            aria-pressed={activeTab === tab.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-ink-3 hover:bg-line"
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

      <div className="flex flex-col xl:flex-row xl:items-start gap-5">
        {/* ── CALENDARIO SEMANAL ── */}
        <div className="flex-1 min-w-0 bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
          {/* Controles */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); }} className="p-1.5 rounded-lg hover:bg-line text-ink-3">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-ink text-sm">{formatRange(mon, sun)}</span>
            <button onClick={() => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); }} className="p-1.5 rounded-lg hover:bg-line text-ink-3">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setBaseDate(new Date())} className="px-3 py-1 rounded-lg text-sm font-medium ml-1 bg-primary text-white hover:bg-primary-hover transition-colors">
              Hoy
            </button>
          </div>

          {/* Cabecera de días */}
          <div className="grid grid-cols-7 min-w-180 border-b border-line">
            {DAYS.map((day, i) => {
              const date = new Date(mon);
              date.setDate(mon.getDate() + i);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div key={day} className={`px-2 py-2 text-center text-xs font-medium border-r last:border-r-0 border-line ${isToday ? "text-info-fg bg-info-bg font-semibold" : "text-ink-3"}`}>
                  {day} {date.getDate()}
                </div>
              );
            })}
          </div>

          {/* Cuerpo */}
          <div className="grid grid-cols-7 min-w-180 min-h-64">
            {isLoading ? (
              <div role="status" className="col-span-7 grid grid-cols-7">
                <span className="sr-only">Cargando agendamientos…</span>
                {DAYS.map((_, i) => (
                  <div key={i} className="border-r last:border-r-0 border-line p-1.5 space-y-1.5" aria-hidden="true">
                    <div className="skeleton h-14" />
                    {i % 2 === 0 && <div className="skeleton h-14" />}
                  </div>
                ))}
              </div>
            ) : (
              DAYS.map((_, i) => (
                <div key={i} className="border-r last:border-r-0 border-line p-1.5 space-y-1.5">
                  {byDay[i].map((item) => {
                    const st = serviceTypeStyle(item.serviceType);
                    return (
                      <div key={item.id} className={`rounded-lg p-1.5 text-xs ${st.tint}`}>
                        <p className="flex items-center gap-1.5 font-semibold">
                          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                          <span className="truncate">{item.title}</span>
                        </p>
                        <p className="truncate mt-0.5">{item.personName}</p>
                        <p className="mt-0.5 font-medium tabular-nums">
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
        <div className="w-full xl:w-72 shrink-0 grid items-start gap-3 md:grid-cols-2 xl:block">
          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center gap-2">
              <Clock size={14} className="text-warning-fg" />
              <span className="font-semibold text-ink text-sm">
                Sin asignar ({pending.length})
              </span>
            </div>

            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {pending.length === 0 && !isLoading && (
                <p className="text-xs text-ink-3 text-center py-6">Sin agendamientos pendientes</p>
              )}

              {pending.map((s) => {
                const st = serviceTypeStyle(s.serviceType);
                const isAssigning = assigningId === s.id;
                const isMutating = anyMutating && isAssigning;

                return (
                  <div key={`${s.originalType}-${s.id}`} className="bg-surface-2 rounded-lg p-3 border border-line">
                    {/* Badge tipo */}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${st.badge}`}>
                      {st.label}
                    </span>

                    {/* Título */}
                    <p className="font-semibold text-ink text-sm leading-tight">{s.title}</p>

                    {/* Meta */}
                    <div className="mt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-ink-3">
                        <User size={10} />
                        <span className="truncate">{s.personName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-3">
                        <Clock size={10} />
                        <span>
                          {new Date(s.dateTime).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                          {" · "}
                          {new Date(s.dateTime).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {s.address && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-3">
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
                            <div className="flex items-center gap-1.5 text-xs text-ink-3 mb-1">
                              <Car size={11} />
                              <span className="font-medium">Asignar vehículo</span>
                            </div>
                            <select
                              className="field text-xs px-2 py-1.5"
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
                          <p className="text-xs text-ink-3 italic">
                            Capacitación en línea — no requiere vehículo
                          </p>
                        )}

                        <div className="flex gap-2">
                          {!s.needsVehicle && (
                            <button
                              onClick={() => handleAssign(s, "")}
                              disabled={isMutating}
                              className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
                            >
                              {isMutating ? "Confirmando…" : "Confirmar inscripción"}
                            </button>
                          )}
                          <button
                            onClick={() => setAssigningId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-ink-3 hover:bg-line-strong border border-line"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningId(s.id)}
                        className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary-hover transition-colors"
                      >
                        Asignar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PANEL REEMBOLSOS ── */}
          {cancelled.length > 0 && (
            <div className="mt-3 bg-surface rounded-xl shadow-sm border border-line overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-center gap-2">
                <Landmark size={14} className="text-danger-fg" />
                <span className="font-semibold text-ink text-sm">
                  Reembolsos ({cancelled.length})
                </span>
              </div>
              <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
                {cancelled.map((s) => {
                  const st = serviceTypeStyle(s.serviceType);
                  const isPendingRefund = s.refundStatus !== "REALIZADO";
                  const isSaving = refundMut.isPending && refundMut.variables?.s.id === s.id;
                  return (
                    <div key={`refund-${s.originalType}-${s.id}`} className="bg-surface-2 rounded-lg p-3 border border-line">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${st.badge}`}>
                        {st.label}
                      </span>
                      <p className="font-semibold text-ink text-sm leading-tight">{s.title}</p>
                      <p className="text-xs text-ink-3 mt-1">{s.personName}</p>
                      {(s.refundBank || s.refundAccount) && (
                        <p className="text-xs text-ink-3 mt-1">
                          {s.refundAccountType ?? "Cuenta"} · {s.refundBank ?? "—"} · {s.refundAccount ?? "—"}
                          {s.refundHolderCedula ? ` · CC ${s.refundHolderCedula}` : ""}
                        </p>
                      )}
                      {isPendingRefund ? (
                        <button
                          onClick={() => refundMut.mutate({ s })}
                          disabled={isSaving}
                          className="mt-2.5 w-full py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 bg-primary text-white hover:bg-primary-hover transition-colors"
                        >
                          {isSaving ? "Guardando…" : "Marcar reembolso realizado"}
                        </button>
                      ) : (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success-fg bg-success-bg rounded-lg py-1.5 px-2">
                          <CheckCircle size={12} /> Reembolso realizado
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="mt-3 bg-surface rounded-xl shadow-sm border border-line p-3">
            <p className="text-xs font-medium text-ink-3 mb-2">Tipos de servicio</p>
            <div className="space-y-1.5">
              {Object.entries(SERVICE_TYPE_STYLE).map(([key, st]) => (
                <div key={key} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-sm shrink-0 ${st.dot}`} />
                  <span className="text-xs text-ink-2">{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
