import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, CheckCircle, UserX, Search, Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getUsers, createUser, updateUser, deleteUser,
  type User,
} from '@/api/users'
import { getRoles } from '@/api/roles'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

// ── Validation ─────────────────────────────────────────────────
const baseSchema = z.object({
  name:     z.string().min(2, 'Mínimo 2 caracteres').max(50),
  lastname: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  email:    z.string().email('Email inválido').max(100),
  id_role:  z.string().uuid().optional().or(z.literal('')),
  cedula:   z.string().max(15).optional().or(z.literal('')),
  phone:    z.string().max(10).optional().or(z.literal('')),
  address:  z.string().max(250).optional().or(z.literal('')),
})

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
})

const editSchema = baseSchema

type CreateFormData = z.infer<typeof createSchema>
type EditFormData   = z.infer<typeof editSchema>

// ── Avatar ─────────────────────────────────────────────────────
const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899']

function Avatar({ name, lastname, idx }: { name: string; lastname: string | null; idx: number }) {
  const bg = COLORS[idx % COLORS.length]
  const initials = `${name[0] ?? ''}${(lastname ?? '')[0] ?? ''}`.toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────
function sanitize(data: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k] = typeof v === 'string' ? v.trim() : v
    }
  }
  return out
}

// ── Page ───────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<'all' | 'active' | 'inactive'>('all')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: roles = [] }            = useQuery({ queryKey: ['roles'], queryFn: getRoles })
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]))

  const activeCount   = users.filter((u) => u.active).length
  const inactiveCount = users.filter((u) => !u.active).length

  // ── Mutations ────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      toast.success('Usuario creado correctamente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al crear el usuario'
      toast.error(msg)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditFormData }) =>
      updateUser(id, sanitize(data) as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      toast.success('Usuario actualizado correctamente')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al actualizar el usuario'
      toast.error(msg)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario desactivado')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al eliminar el usuario'
      toast.error(msg)
    },
  })

  // ── Form ─────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({ resolver: zodResolver(editTarget ? editSchema : createSchema) as any })

  const openCreate = () => {
    setEditTarget(null)
    reset({ name: '', lastname: '', email: '', password: '', id_role: '', cedula: '', phone: '', address: '' })
    setModalOpen(true)
  }

  const openEdit = (u: User) => {
    setEditTarget(u)
    reset({
      name:     u.name ?? '',
      lastname: u.lastname ?? '',
      email:    u.email ?? '',
      id_role:  u.id_role ?? '',
      cedula:   u.cedula ?? '',
      phone:    u.phone ?? '',
      address:  u.address ?? '',
    })
    setModalOpen(true)
  }

  const onSubmit = (data: CreateFormData) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data })
    } else {
      createMut.mutate(sanitize(data) as any)
    }
  }

  // ── Filter ───────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      `${u.name} ${u.lastname ?? ''}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.active) ||
      (statusFilter === 'inactive' && !u.active)
    return matchSearch && matchStatus
  })

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Usuarios · Talento humano</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona el personal de la plataforma y los roles asignados</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus size={14} /> Agregar usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users}       iconBg="#EFF6FF" iconColor="#3B82F6" value={users.length}   label="Total usuarios" />
        <StatCard icon={CheckCircle} iconBg="#F0FDF4" iconColor="#22C55E" value={activeCount}    label="Activos" />
        <StatCard icon={UserX}       iconBg="#FEF2F2" iconColor="#EF4444" value={inactiveCount}  label="Inactivos" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar personal..."
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none w-48"
          />
        </div>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              f === statusFilter ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={f === statusFilter ? { backgroundColor: '#1D3461' } : {}}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activo' : 'Inactivo'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando usuarios...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Cédula</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Teléfono</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} lastname={u.lastname} idx={i} />
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{u.name} {u.lastname}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.id_role ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {roleMap[u.id_role] ?? 'Sin rol'}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {u.cedula ?? <span className="text-slate-300 italic text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {u.phone ?? <span className="text-slate-300 italic text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.active ? 'success' : 'default'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(u)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deleteMut.isPending && deleteMut.variables === u.id}
                        onClick={() => {
                          if (window.confirm(`¿Desactivar al usuario "${u.name} ${u.lastname ?? ''}"?`)) {
                            deleteMut.mutate(u.id)
                          }
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? 'Editar usuario' : 'Nuevo usuario'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          {/* Name + Lastname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                placeholder="Nombre"
                {...register('name')}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.lastname ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                placeholder="Apellido"
                {...register('lastname')}
              />
              {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              placeholder="correo@ejemplo.com"
              {...register('email')}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Password — solo en creación */}
          {!editTarget && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${(errors as any).password ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
              />
              {(errors as any).password && (
                <p className="text-red-500 text-xs mt-1">{(errors as any).password.message}</p>
              )}
            </div>
          )}

          {/* Role + Cedula */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                {...register('id_role')}
              >
                <option value="">Sin rol</option>
                {roles.filter((r) => r.active).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Cédula"
                {...register('cedula')}
              />
            </div>
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Teléfono"
                {...register('phone')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Dirección"
                {...register('address')}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
