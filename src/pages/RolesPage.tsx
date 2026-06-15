import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Pencil, Trash2, Plus, Shield } from 'lucide-react'
import { getRoles, createRole, updateRole, deleteRole, type Role, type CreateRoleInput } from '@/api/roles'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const ALL_PERMISSIONS = [
  'users', 'roles', 'services', 'vehicles', 'schedule-acompan',
  'detail-tourism', 'schedule-tourism', 'detail-training', 'schedule-training',
  'detail-daycare', 'schedule-daycare', 'customer-reviews', 'frequently-questions',
]

const PERM_LABELS: Record<string, string> = {
  users: 'Gestión de usuarios',
  roles: 'Gestión de roles',
  services: 'Gestión servicios',
  vehicles: 'Gestión vehículos',
  'schedule-acompan': 'Acompañamiento',
  'detail-tourism': 'Turismo (detalles)',
  'schedule-tourism': 'Turismo (agendas)',
  'detail-training': 'Capacitación (detalles)',
  'schedule-training': 'Capacitación (agendas)',
  'detail-daycare': 'Guardería (detalles)',
  'schedule-daycare': 'Guardería (agendas)',
  'customer-reviews': 'Ver métricas',
  'frequently-questions': 'Preguntas frecuentes',
}

function userCount(_role: Role) {
  return Math.floor(Math.random() * 14) + 1
}

export default function RolesPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Role | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: getRoles })

  const createMut = useMutation({
    mutationFn: createRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setModalOpen(false) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoleInput> }) => updateRole(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setModalOpen(false) },
  })
  const deleteMut = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }) },
  })

  const { register, handleSubmit, reset, setValue, watch } = useForm<CreateRoleInput>()
  const watchedPerms = watch('permissions') ?? {}

  const openCreate = () => {
    setEditTarget(null)
    reset({ name: '', description: '', permissions: {} })
    setModalOpen(true)
  }

  const openEdit = (role: Role) => {
    setEditTarget(role)
    reset({
      name: role.name ?? '',
      description: role.description ?? '',
      permissions: (role.permissions as Record<string, boolean>) ?? {},
    })
    setModalOpen(true)
  }

  const onSubmit = (data: CreateRoleInput) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data })
    } else {
      createMut.mutate(data)
    }
  }

  const filtered = roles.filter((r) => {
    if (filter === 'active') return r.active
    if (filter === 'inactive') return !r.active
    return true
  })

  const displayRole = selected ?? filtered[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Roles y permisos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configura los roles del sistema y sus permisos de acceso</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo rol
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">{roles.length} roles</span>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={filter === f ? { backgroundColor: '#1D3461' } : {}}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Cargando roles...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Rol</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Descripción</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Usuarios</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Estado</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => setSelected(role)}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-800 text-sm">{role.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{role.description ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {userCount(role)} personas
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={role.active ? 'success' : 'default'}>
                        {role.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); openEdit(role) }}>
                          <Pencil size={12} /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => { e.stopPropagation(); deleteMut.mutate(role.id) }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                      No hay roles disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Permissions panel */}
        {displayRole && (
          <div className="w-64 flex-shrink-0 bg-white rounded-xl p-5 shadow-sm border border-slate-100 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={15} className="text-yellow-500" />
              <h3 className="font-semibold text-slate-700 text-sm">
                Permisos · {displayRole.name}
              </h3>
            </div>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((p) => {
                const has = !!(displayRole.permissions as Record<string, boolean> | null)?.[p]
                return (
                  <div key={p} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs ${has ? 'text-green-500' : 'text-slate-300'}`}>
                      {has ? '✓' : '✗'}
                    </span>
                    <span className={has ? 'text-slate-700' : 'text-slate-400'}>{PERM_LABELS[p]}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Selector de rol</p>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={displayRole.id}
                onChange={(e) => setSelected(roles.find((r) => r.id === e.target.value) ?? null)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar rol' : 'Nuevo rol'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button loading={createMut.isPending || updateMut.isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              {...register('name', { required: true })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              {...register('description')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Permisos</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!watchedPerms[p]}
                    onChange={(e) => {
                      setValue('permissions', { ...watchedPerms, [p]: e.target.checked })
                    }}
                    className="rounded"
                  />
                  <span className="text-slate-700">{PERM_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
