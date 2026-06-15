import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react'
import { getSchedulesAcompan, updateScheduleAcompan } from '@/api/schedules'
import { getVehicles } from '@/api/vehicles'

type ViewMode = 'dia' | 'semana' | 'mes'

const DAYS = ['Lun', 'Mar', 'Miérc', 'Jue', 'Vie']

const TYPE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'ACOMPAÑAMIENTO': { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  'TURISMO':        { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  'CAPACITACION':   { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  'GUARDERIA':      { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
  default:          { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
}

function getWeekRange(base: Date) {
  const d = new Date(base)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  return { mon, fri }
}

function formatRange(mon: Date, fri: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `Semana del ${mon.toLocaleDateString('es-CO', opts)} — ${fri.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export default function DistributionPage() {
  const [view, setView] = useState<ViewMode>('semana')
  const [baseDate, setBaseDate] = useState(new Date())
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const qc = useQueryClient()
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules-acompan'],
    queryFn: getSchedulesAcompan,
  })
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles })

  const assignMut = useMutation({
    mutationFn: ({ id, vehicle_id }: { id: string; vehicle_id: string }) =>
      updateScheduleAcompan(id, { id_vehicle: vehicle_id, status: 'EN CURSO' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules-acompan'] }); setAssigningId(null) },
  })

  const { mon, fri } = getWeekRange(baseDate)
  const prevWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d) }
  const nextWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d) }
  const goToday  = () => setBaseDate(new Date())

  const weekStart = new Date(mon); weekStart.setHours(0, 0, 0, 0)
  const weekEnd   = new Date(fri); weekEnd.setHours(23, 59, 59, 999)

  const schedulesByDay: Record<number, typeof schedules> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
  schedules.forEach((s) => {
    const d = new Date(s.date_time)
    if (d >= weekStart && d <= weekEnd) {
      const weekDay = d.getDay() - 1
      if (weekDay >= 0 && weekDay <= 4) schedulesByDay[weekDay].push(s)
    }
  })

  const unassigned = schedules.filter((s) => !s.status || s.status === 'PENDIENTE')

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Panel de distribución</h1>
          <p className="text-sm text-slate-500 mt-0.5">Asigna y distribuye servicios a los usuarios registrados</p>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
            <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-700 text-sm">{formatRange(mon, fri)}</span>
            <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={16} />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1 rounded-lg text-sm text-white font-medium ml-1"
              style={{ backgroundColor: '#1D3461' }}
            >
              Hoy
            </button>
            <div className="ml-auto flex border border-slate-200 rounded-lg overflow-hidden text-sm">
              {(['dia', 'semana', 'mes'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    view === v ? 'bg-slate-100 font-medium text-slate-700' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-5 border-b border-slate-100">
            {DAYS.map((day, i) => {
              const date = new Date(mon)
              date.setDate(mon.getDate() + i)
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div
                  key={day}
                  className={`px-3 py-2 text-center text-sm font-medium border-r last:border-r-0 border-slate-100 ${
                    isToday ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {day} {date.getDate()}
                </div>
              )
            })}
          </div>

          {/* Calendar body */}
          <div className="grid grid-cols-5 min-h-64">
            {isLoading ? (
              <div className="col-span-5 py-12 text-center text-slate-400 text-sm">Cargando...</div>
            ) : (
              DAYS.map((_, i) => {
                const dayItems = schedulesByDay[i].map((s) => ({
                  id: s.id,
                  title: s.service?.name ?? 'Servicio',
                  person: s.reference,
                  type: s.service?.type ?? 'default',
                }))
                return (
                  <div key={i} className="border-r last:border-r-0 border-slate-100 p-2 space-y-2">
                    {dayItems.map((item) => {
                      const style = TYPE_STYLE[item.type] ?? TYPE_STYLE.default
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg p-2 border-l-4 text-xs"
                          style={{ backgroundColor: style.bg, borderLeftColor: style.border }}
                        >
                          <p className="font-semibold" style={{ color: style.text }}>{item.title}</p>
                          <p className="mt-0.5" style={{ color: style.text, opacity: 0.75 }}>{item.person}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Unassigned panel */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="font-semibold text-slate-700 text-sm">
                Sin asignar ({unassigned.length})
              </span>
            </div>
            <div className="p-3 space-y-3">
              {unassigned.length === 0 && !isLoading && (
                <p className="text-xs text-slate-400 text-center py-4">Sin servicios pendientes</p>
              )}
              {unassigned.slice(0, 5).map((s) => {
                const style = TYPE_STYLE[s.service?.type ?? 'default'] ?? TYPE_STYLE.default
                return (
                  <div key={s.id} className="bg-slate-50 rounded-lg p-3">
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {s.service?.type ?? '—'}
                    </span>
                    <p className="font-medium text-slate-800 text-sm">{s.service?.name ?? 'Servicio'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><User size={10} /> {s.reference}</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {new Date(s.date_time).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {assigningId === s.id ? (
                      <div className="mt-2 space-y-1">
                        <select
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                          onChange={(e) => {
                            if (e.target.value) assignMut.mutate({ id: s.id, vehicle_id: e.target.value })
                          }}
                        >
                          <option value="">Seleccionar vehículo</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} — {v.license_plate}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setAssigningId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningId(s.id)}
                        className="mt-2 w-full py-1.5 rounded-lg text-xs text-white font-medium"
                        style={{ backgroundColor: '#1D3461' }}
                      >
                        Asignar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
