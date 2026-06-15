import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  getFrequentlyQuestions, createFrequentlyQuestion,
  updateFrequentlyQuestion, deleteFrequentlyQuestion,
  type FrequentlyQuestion, type CreateFrequentlyQuestionInput,
} from '@/api/frequently-questions'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

const schema = z.object({
  question: z.string().min(5, 'La pregunta debe tener al menos 5 caracteres'),
  response: z.string().min(5, 'La respuesta debe tener al menos 5 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function FAQPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<FrequentlyQuestion | null>(null)

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['frequently-questions'],
    queryFn: getFrequentlyQuestions,
  })

  const createMut = useMutation({
    mutationFn: (data: CreateFrequentlyQuestionInput) => createFrequentlyQuestion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequently-questions'] })
      setModalOpen(false)
      toast.success('Pregunta creada correctamente')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al crear'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateFrequentlyQuestionInput> }) =>
      updateFrequentlyQuestion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequently-questions'] })
      setModalOpen(false)
      toast.success('Pregunta actualizada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteFrequentlyQuestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frequently-questions'] })
      toast.success('Pregunta eliminada')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al eliminar'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const openCreate = () => {
    setEditTarget(null)
    reset({ question: '', response: '' })
    setModalOpen(true)
  }

  const openEdit = (faq: FrequentlyQuestion) => {
    setEditTarget(faq)
    const responseText = typeof faq.response === 'string'
      ? faq.response
      : JSON.stringify(faq.response)
    reset({ question: faq.question, response: responseText })
    setModalOpen(true)
  }

  const onSubmit = (data: FormData) => {
    const payload: CreateFrequentlyQuestionInput = {
      question: data.question.trim(),
      response: data.response.trim(),
    }
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  const displayResponse = (faq: FrequentlyQuestion) => {
    if (typeof faq.response === 'string') return faq.response
    return JSON.stringify(faq.response)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Preguntas frecuentes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona las FAQ que se muestran en la app móvil</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva pregunta
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 text-sm">
          Cargando preguntas...
        </div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
          <HelpCircle size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No hay preguntas frecuentes registradas</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus size={14} /> Agregar primera pregunta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={faq.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ backgroundColor: '#2A5298' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm mb-1">{faq.question}</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{displayResponse(faq)}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => openEdit(faq)}>
                    <Pencil size={12} /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={deleteMut.isPending && deleteMut.variables === faq.id}
                    onClick={() => {
                      if (window.confirm('¿Eliminar esta pregunta?')) deleteMut.mutate(faq.id)
                    }}
                  >
                    <Trash2 size={12} /> Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? 'Editar pregunta' : 'Nueva pregunta frecuente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? 'Guardar cambios' : 'Crear pregunta'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pregunta <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.question ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              placeholder="¿Cómo agendo un servicio?"
              {...register('question')}
            />
            {errors.question && <p className="text-red-500 text-xs mt-1">{errors.question.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Respuesta <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none ${errors.response ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
              placeholder="Puede agendar el servicio desde la pantalla principal..."
              {...register('response')}
            />
            {errors.response && <p className="text-red-500 text-xs mt-1">{errors.response.message}</p>}
          </div>
        </form>
      </Modal>
    </div>
  )
}
