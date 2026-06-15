import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsDaycare,
  createDetailDaycare,
  updateDetailDaycare,
  deleteDetailDaycare,
  type DetailDaycare,
  type CreateDetailDaycareInput,
} from "@/api/details-daycare";
import { getServices } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  mode_name: z.string().optional(),
  mode_hours: z.number().int().nonnegative().optional(),
  address_point: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function DaycareDetailPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailDaycare | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["detail-daycare"],
    queryFn: getDetailsDaycare,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const daycareServices = services.filter(
    (s) => s.type === "GUARDERIA" && s.active,
  );

  const createMut = useMutation({
    mutationFn: createDetailDaycare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-daycare"] });
      setModalOpen(false);
      toast.success("Plan de guardería creado");
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
      data: Partial<CreateDetailDaycareInput>;
    }) => updateDetailDaycare(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-daycare"] });
      setModalOpen(false);
      toast.success("Plan actualizado");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailDaycare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-daycare"] });
      toast.success("Plan eliminado");
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
    reset({ id_service: "", mode_name: "", mode_hours: 0, address_point: "" });
    setModalOpen(true);
  };

  const openEdit = (item: DetailDaycare) => {
    setEditTarget(item);
    reset({
      id_service: item.id_service,
      mode_name: item.service_mode?.name ?? "",
      mode_hours: item.service_mode?.hours ?? 0,
      address_point: item.address_point ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const service_mode =
      data.mode_name || data.mode_hours
        ? { name: data.mode_name, hours: data.mode_hours }
        : undefined;
    const payload: CreateDetailDaycareInput = {
      id_service: data.id_service,
      ...(service_mode && { service_mode }),
      ...(data.address_point?.trim() && { address_point: data.address_point }),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const modeName = (item: DetailDaycare) =>
    item.service_mode?.name ?? (
      <span className="text-slate-300 italic text-xs">—</span>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Detalles de guardería
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona planes y modalidades del servicio de guardería
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo plan
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando planes...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Modalidad
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Horas
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Punto de atención
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Estado
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
                  <td className="px-5 py-3.5 font-medium text-slate-800 text-sm">
                    {modeName(item)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {item.service_mode?.hours != null ? (
                      `${item.service_mode.hours} h`
                    ) : (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-45 truncate">
                    {item.address_point ?? (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        item.active
                          ? { backgroundColor: "#D1FAE5", color: "#065F46" }
                          : { backgroundColor: "#FEE2E2", color: "#991B1B" }
                      }
                    >
                      {item.active ? "Activo" : "Inactivo"}
                    </span>
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
                          if (
                            window.confirm("¿Eliminar este plan de guardería?")
                          )
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
                    No hay planes de guardería registrados
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
        title={editTarget ? "Editar plan" : "Nuevo plan de guardería"}
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
              {editTarget ? "Guardar cambios" : "Crear plan"}
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
              {daycareServices.map((s) => (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de modalidad
              </label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Plan Básico"
                {...register("mode_name")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Horas por día
              </label>
              <input
                type="number"
                min={0}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                {...register("mode_hours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Punto de atención
            </label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Carrera 10 #20-30"
              {...register("address_point")}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
