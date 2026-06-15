import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  type Category, type CreateCategoryInput, type UpdateCategoryInput,
} from '@/api/categories'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const schema = z.object({
  name:        z.string().min(1, 'Nombre requerido').max(30),
  description: z.string().max(250).optional(),
  active:      z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const createMut = useMutation({
    mutationFn: (data: CreateCategoryInput) => createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setModalOpen(false)
      toast.success('Categoría creada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setModalOpen(false)
      toast.success('Categoría actualizada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría eliminada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al eliminar'),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const activeField = watch('active')

  const openCreate = () => {
    setEditTarget(null)
    reset({ name: '', description: '', active: true })
    setModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditTarget(c)
    reset({ name: c.name, description: c.description ?? '', active: c.active })
    setModalOpen(true)
  }

  const onSubmit = (data: FormData) => {
    const payload: CreateCategoryInput = {
      name: data.name,
      active: data.active,
      ...(data.description ? { description: data.description } : {}),
    }
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isPending  = createMut.isPending || updateMut.isPending
  const activeList = categories.filter((c) => c.active)
  const inactive   = categories.filter((c) => !c.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Categorías de productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeList.length} activas · {inactive.length} inactivas
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={14} /> Nueva categoría</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando categorías...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Nombre</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Descripción</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Creación</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-medium text-slate-800 text-sm">{c.name}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[200px] truncate">
                    {c.description ?? <span className="text-slate-300 italic text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={c.active
                        ? { backgroundColor: '#D1FAE5', color: '#065F46' }
                        : { backgroundColor: '#FEE2E2', color: '#991B1B' }}
                    >
                      {c.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(c.created_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(c)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deleteMut.isPending && deleteMut.variables === c.id}
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${c.name}"?`)) deleteMut.mutate(c.id)
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No hay categorías registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
              placeholder="Ropa deportiva"
              {...register('name')}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="Descripción opcional"
              {...register('description')}
            />
          </div>

          {editTarget && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Estado activo</p>
                <p className="text-xs text-slate-400">La categoría aparece disponible en la app</p>
              </div>
              <button
                type="button"
                onClick={() => setValue('active', !activeField, { shouldValidate: true })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                  activeField ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    activeField ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
