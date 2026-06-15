import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsTourism,
  createDetailTourism,
  updateDetailTourism,
  deleteDetailTourism,
  type DetailTourism,
  type CreateDetailTourismInput,
} from "@/api/details-tourism";
import { getServices } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  date_output: z.string().min(1, "Fecha de salida requerida"),
  date_arrival: z.string().min(1, "Fecha de llegada requerida"),
  quotas: z.number().int().positive("Debe ser un número positivo"),
  meeting_point_address: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function TourismDetailPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTourism | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["detail-tourism"],
    queryFn: getDetailsTourism,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const tourismServices = services.filter(
    (s) => s.type === "TURISMO" && s.active,
  );

  const createMut = useMutation({
    mutationFn: createDetailTourism,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      setModalOpen(false);
      toast.success("Excursión creada correctamente");
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
      data: Partial<CreateDetailTourismInput>;
    }) => updateDetailTourism(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      setModalOpen(false);
      toast.success("Excursión actualizada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTourism,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      toast.success("Excursión eliminada");
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
      name: "",
      description: "",
      date_output: "",
      date_arrival: "",
      quotas: 1,
      meeting_point_address: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: DetailTourism) => {
    setEditTarget(item);
    reset({
      id_service: item.id_service,
      name: item.name,
      description: item.description ?? "",
      date_output: item.date_output?.slice(0, 16) ?? "",
      date_arrival: item.date_arrival?.slice(0, 16) ?? "",
      quotas: item.quotas,
      meeting_point_address: item.meeting_point_address ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateDetailTourismInput = {
      id_service: data.id_service,
      name: data.name,
      date_output: data.date_output,
      date_arrival: data.date_arrival,
      quotas: data.quotas,
      ...(data.description && { description: data.description }),
      ...(data.meeting_point_address && {
        meeting_point_address: data.meeting_point_address,
      }),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Detalles de turismo
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona excursiones y salidas turísticas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva excursión
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando excursiones...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Excursión
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Fechas
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Users size={12} /> Cupos
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Punto encuentro
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
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-400 truncate max-w-52">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    <div>Salida: {fmt(item.date_output)}</div>
                    <div>Llegada: {fmt(item.date_arrival)}</div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    {item.quotas_available} / {item.quotas}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-40 truncate">
                    {item.meeting_point_address ?? (
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
                          if (window.confirm(`¿Eliminar "${item.name}"?`))
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
                    No hay excursiones registradas
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
        title={editTarget ? "Editar excursión" : "Nueva excursión"}
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
              {editTarget ? "Guardar cambios" : "Crear excursión"}
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
              {tourismServices.map((s) => (
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
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.name ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              placeholder="Excursión Cartagena"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
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
                Fecha salida <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.date_output ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("date_output")}
              />
              {errors.date_output && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.date_output.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha llegada <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.date_arrival ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("date_arrival")}
              />
              {errors.date_arrival && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.date_arrival.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cupos totales <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.quotas ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("quotas", { valueAsNumber: true })}
              />
              {errors.quotas && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.quotas.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Punto de encuentro
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Terminal de transportes"
                {...register("meeting_point_address")}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
