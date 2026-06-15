import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock, Video } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsTraining,
  createDetailTraining,
  updateDetailTraining,
  deleteDetailTraining,
  type DetailTraining,
  type CreateDetailTrainingInput,
} from "@/api/details-training";
import { getServices } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  topic: z.string().min(1, "El tema es requerido"),
  description: z.string().optional(),
  date_time: z.string().min(1, "Fecha y hora requeridas"),
  duration: z.number().int().positive("Debe ser un número positivo"),
  link_meet: z.string().url("URL inválida").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function TrainingDetailPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTraining | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["detail-training"],
    queryFn: getDetailsTraining,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const trainingServices = services.filter(
    (s) => s.type === "CAPACITACION" && s.active,
  );

  const createMut = useMutation({
    mutationFn: createDetailTraining,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      setModalOpen(false);
      toast.success("Capacitación creada correctamente");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al crear",
      ),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateDetailTrainingInput>;
    }) => updateDetailTraining(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      setModalOpen(false);
      toast.success("Capacitación actualizada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTraining,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      toast.success("Capacitación eliminada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al eliminar",
      ),
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
    reset({
      id_service: "",
      topic: "",
      description: "",
      date_time: "",
      duration: 60,
      link_meet: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: DetailTraining) => {
    setEditTarget(item);
    reset({
      id_service: item.id_service,
      topic: item.topic,
      description: item.description ?? "",
      date_time: item.date_time?.slice(0, 16) ?? "",
      duration: item.duration,
      link_meet: item.link_meet ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateDetailTrainingInput = {
      id_service: data.id_service,
      topic: data.topic,
      date_time: data.date_time,
      duration: data.duration,
      ...(data.description && { description: data.description }),
      ...(data.link_meet && { link_meet: data.link_meet }),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Detalles de capacitación
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona talleres y cursos de formación
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva capacitación
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando capacitaciones...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Tema
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Fecha y hora
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> Duración (min)
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Video size={12} /> Enlace
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800 text-sm">
                      {item.topic}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-400 truncate max-w-52">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(item.date_time).toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    {item.duration}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.link_meet ? (
                      <a
                        href={item.link_meet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate max-w-35 block"
                      >
                        {item.link_meet}
                      </a>
                    ) : (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(item)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={
                          deleteMut.isPending && deleteMut.variables === item.id
                        }
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${item.topic}"?`))
                            deleteMut.mutate(item.id);
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-400 text-sm"
                  >
                    No hay capacitaciones registradas
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
        title={editTarget ? "Editar capacitación" : "Nueva capacitación"}
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
              {editTarget ? "Guardar cambios" : "Crear capacitación"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Servicio <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.id_service ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              {...register("id_service")}
            >
              <option value="">Seleccionar servicio</option>
              {trainingServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.id_service && (
              <p className="text-red-500 text-xs mt-1">
                {errors.id_service.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tema <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.topic ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              placeholder="Manejo de tecnología"
              {...register("topic")}
            />
            {errors.topic && (
              <p className="text-red-500 text-xs mt-1">
                {errors.topic.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Descripción opcional"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha y hora <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.date_time ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("date_time")}
              />
              {errors.date_time && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.date_time.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duración (min) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.duration ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("duration", { valueAsNumber: true })}
              />
              {errors.duration && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.duration.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Enlace Meet
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.link_meet ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              placeholder="https://meet.google.com/..."
              {...register("link_meet")}
            />
            {errors.link_meet && (
              <p className="text-red-500 text-xs mt-1">
                {errors.link_meet.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
