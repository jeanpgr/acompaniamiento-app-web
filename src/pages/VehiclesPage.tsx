import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Truck, AlertTriangle } from 'lucide-react'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, type Vehicle, type CreateVehicleInput } from '@/api/vehicles'
import { getUsers } from '@/api/users'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import StatCard from '@/components/ui/StatCard'
import { useForm } from 'react-hook-form'

export default function VehiclesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)

  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createMut = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setModalOpen(false) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVehicleInput> }) => updateVehicle(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setModalOpen(false) },
  })
  const deleteMut = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  })

  const { register, handleSubmit, reset } = useForm<CreateVehicleInput>()

  const openCreate = () => { setEditTarget(null); reset(); setModalOpen(true) }
  const openEdit = (v: Vehicle) => {
    setEditTarget(v)
    reset({ id_driver: v.id_driver, name: v.name, model: v.model, license_plate: v.license_plate, capacity: v.capacity ?? undefined })
    setModalOpen(true)
  }
  const onSubmit = (data: CreateVehicleInput) => {
    if (editTarget) updateMut.mutate({ id: editTarget.id, data })
    else createMut.mutate(data)
  }

  const reviewDue = vehicles.filter((v) => {
    if (!v.next_review) return false
    return new Date(v.next_review) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }).length

  const userMap = Object.fromEntries(users.map((u) => [u.id, `${u.name} ${u.lastname}`]))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Gestión de vehículos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Administra la flota de vehículos y sus revisiones</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo vehículo
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={Truck} iconBg="#EFF6FF" iconColor="#3B82F6" value={vehicles.length} label="Total vehículos" />
        <StatCard icon={Truck} iconBg="#F0FDF4" iconColor="#22C55E" value={vehicles.filter((v) => v.active).length} label="Activos" />
        <StatCard icon={AlertTriangle} iconBg="#FEF3C7" iconColor="#F59E0B" value={reviewDue} label="Revisión próxima" />
        <StatCard icon={Truck} iconBg="#F1F5F9" iconColor="#64748B" value={vehicles.filter((v) => !v.active).length} label="Inactivos" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando vehículos...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Vehículo</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Placa</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Capacidad</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Conductor</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Próx. revisión</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const reviewSoon = v.next_review && new Date(v.next_review) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                return (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Truck size={15} className="text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{v.name}</p>
                          <p className="text-xs text-slate-400">{v.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-sm text-slate-700">{v.license_plate}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{v.capacity ?? '—'} personas</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{userMap[v.id_driver] ?? 'Sin asignar'}</td>
                    <td className="px-5 py-3.5">
                      {v.next_review ? (
                        <span className={`text-sm ${reviewSoon ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                          {reviewSoon && <AlertTriangle size={12} className="inline mr-1" />}
                          {new Date(v.next_review).toLocaleDateString('es-CO')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={v.active ? 'success' : 'default'}>{v.active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openEdit(v)}><Pencil size={12} /> Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => deleteMut.mutate(v.id)}><Trash2 size={12} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No hay vehículos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar vehículo' : 'Nuevo vehículo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? 'Guardar cambios' : 'Crear vehículo'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('model', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('license_plate', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Capacidad</label>
            <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('capacity', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Conductor</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('id_driver', { required: true })}>
              <option value="">Seleccionar conductor</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} {u.lastname}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Próxima revisión</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" {...register('next_review')} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
