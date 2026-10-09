import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, HelpCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getFrequentlyQuestions,
  createFrequentlyQuestion,
  updateFrequentlyQuestion,
  deleteFrequentlyQuestion,
  type FrequentlyQuestion,
  type CreateFrequentlyQuestionInput,
} from "@/api/frequently-questions";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import SearchInput from "@/components/ui/SearchInput";

const schema = z.object({
  question: z.string().min(5, "La pregunta debe tener al menos 5 caracteres"),
  response: z.string().min(5, "La respuesta debe tener al menos 5 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function FAQPage() {
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FrequentlyQuestion | null>(null);
  const [search, setSearch] = useState("");

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["frequently-questions"],
    queryFn: getFrequentlyQuestions,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateFrequentlyQuestionInput) =>
      createFrequentlyQuestion(data),
    meta: {
      invalidates: "frequently-questions",
      successMessage: "Pregunta creada correctamente",
      errorMessage: "Error al crear",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateFrequentlyQuestionInput>;
    }) => updateFrequentlyQuestion(id, data),
    meta: {
      invalidates: "frequently-questions",
      successMessage: "Pregunta actualizada",
      errorMessage: "Error al actualizar",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFrequentlyQuestion,
    meta: {
      invalidates: "frequently-questions",
      successMessage: "Pregunta eliminada",
      errorMessage: "Error al eliminar",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => {
    setEditTarget(null);
    reset({ question: "", response: "" });
    setModalOpen(true);
  };

  const openEdit = (faq: FrequentlyQuestion) => {
    setEditTarget(faq);
    const responseText =
      typeof faq.response === "string"
        ? faq.response
        : JSON.stringify(faq.response);
    reset({ question: faq.question, response: responseText });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateFrequentlyQuestionInput = {
      question: data.question.trim(),
      response: data.response.trim(),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const displayResponse = (faq: FrequentlyQuestion) => {
    if (typeof faq.response === "string") return faq.response;
    return JSON.stringify(faq.response);
  };

  // Pocas preguntas y sin paginar: la búsqueda filtra en el navegador.
  const q = search.trim().toLowerCase();
  const visible = q
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(q) ||
          displayResponse(faq).toLowerCase().includes(q),
      )
    : faqs;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Preguntas frecuentes
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Gestiona las FAQ que se muestran en la app móvil
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nueva pregunta
        </Button>
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar en preguntas y respuestas"
          label="Buscar preguntas frecuentes"
        />
      </div>

      {isLoading ? (
        <div className="card">
          <TableSkeleton rows={4} label="Cargando preguntas…" />
        </div>
      ) : faqs.length === 0 ? (
        <div className="card p-12 text-center">
          <HelpCircle size={36} className="text-line-strong mx-auto mb-3" />
          <p className="text-ink-3 text-sm">
            No hay preguntas frecuentes registradas
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus size={16} /> Agregar primera pregunta
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-ink-3 text-sm">
            Sin resultados para "{search.trim()}"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((faq, idx) => (
            <div
              key={faq.id}
              className="card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-base mb-1">
                      {faq.question}
                    </p>
                    <p className="text-ink-3 text-[15px] leading-relaxed">
                      {displayResponse(faq)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    aria-label={"Editar pregunta"}
                    title="Editar"
                    variant="secondary"
                    onClick={() => openEdit(faq)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    aria-label={"Eliminar pregunta"}
                    title="Eliminar"
                    variant="danger-soft"
                    loading={
                      deleteMut.isPending && deleteMut.variables === faq.id
                    }
                    onClick={async () => {
                      if (await confirm({ title: "¿Eliminar esta pregunta?" }))
                        deleteMut.mutate(faq.id);
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
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
        title={editTarget ? "Editar pregunta" : "Nueva pregunta frecuente"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear pregunta"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="faq-question"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Pregunta <span className="text-danger-fg">*</span>
            </label>
            <input
              id="faq-question"
              className="field"
              aria-invalid={!!errors.question}
              placeholder="¿Cómo agendo un servicio?"
              {...register("question")}
            />
            {errors.question && (
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.question.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="faq-response"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Respuesta <span className="text-danger-fg">*</span>
            </label>
            <textarea
              id="faq-response"
              rows={4}
              className="field resize-none"
              aria-invalid={!!errors.response}
              placeholder="Puede agendar el servicio desde la pantalla principal..."
              {...register("response")}
            />
            {errors.response && (
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.response.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
