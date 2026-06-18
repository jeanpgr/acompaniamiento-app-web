import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsDaycare,
  getDetailsDaycareByService,
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
  mode_name: z.string().min(1, "El nombre de modalidad es requerido"),
  mode_hours: z
    .number({ message: "Ingresa un número" })
    .int()
    .nonnegative("Debe ser 0 o mayor"),
  mode_price_pickup: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
  mode_price_dropoff: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
  address_point: z.string().min(1, "La dirección es requerida"),
});

type FormData = z.infer<typeof schema>;

export default function DaycareDetailPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailDaycare | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: serviceId ? ["detail-daycare", serviceId] : ["detail-daycare"],
    queryFn: () =>
      serviceId ? getDetailsDaycareByService(serviceId) : getDetailsDaycare(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const daycareServices = services.filter((s) => s.type === "GUARDERIA" && s.active);
  const currentService = serviceId ? services.find((s) => s.id === serviceId) : null;

  const createMut = useMutation({
    mutationFn: createDetailDaycare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-daycare"] });
      setModalOpen(false);
      toast.success("Modalidad de guardería creada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Error al crear",
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
      toast.success("Modalidad actualizada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailDaycare,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-daycare"] });
      toast.success("Modalidad eliminada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Error al eliminar",
      ),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditTarget(null);
    reset({
      id_service: serviceId ?? "",
      mode_name: "",
      mode_hours: 0,
      mode_price_pickup: undefined,
      mode_price_dropoff: undefined,
      address_point: "",
    });
    setModalOpen(true);
  };

  const openEdit = (item: DetailDaycare) => {
    setEditTarget(item);
    reset({
      id_service: item.id_service,
      mode_name: item.service_mode?.name ?? "",
      mode_hours: item.service_mode?.hours ?? 0,
      mode_price_pickup: item.service_mode?.price_pickup ?? undefined,
      mode_price_dropoff: item.service_mode?.price_dropoff ?? undefined,
      address_point: item.address_point ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const service_mode = {
      name: data.mode_name,
      hours: data.mode_hours,
      ...(data.mode_price_pickup != null && { price_pickup: data.mode_price_pickup }),
      ...(data.mode_price_dropoff != null && { price_dropoff: data.mode_price_dropoff }),
    };
    const payload: CreateDetailDaycareInput = {
      id_service: data.id_service,
      service_mode,
      address_point: data.address_point,
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const formatPrice = (val?: number) =>
    val != null ? `$ ${val.toLocaleString("es-CO")}` : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {serviceId && (
            <button
              onClick={() => navigate("/services")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-1 transition-colors"
            >
              <ArrowLeft size={12} /> Volver a servicios
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-800">
            {currentService ? `Guardería · ${currentService.name}` : "Detalles de guardería"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {serviceId
              ? "Modalidades y planes de este servicio de guardería"
              : "Gestiona planes y modalidades del servicio de guardería"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva modalidad
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando modalidades...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Modalidad</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Horas / día</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Precio recogida</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Precio entrega</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Dirección
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3.5 font-medium text-slate-800 text-sm">
                    {item.service_mode?.name ?? (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {item.service_mode?.hours != null ? (
                      `${item.service_mode.hours} h`
                    ) : (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {formatPrice(item.service_mode?.price_pickup) ?? (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {formatPrice(item.service_mode?.price_dropoff) ?? (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-44 truncate">
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
                        loading={deleteMut.isPending && deleteMut.variables === item.id}
                        onClick={() => {
                          if (window.confirm("¿Eliminar esta modalidad de guardería?"))
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
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No hay modalidades de guardería registradas
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
        title={editTarget ? "Editar modalidad" : "Nueva modalidad de guardería"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear modalidad"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Servicio */}
          {!serviceId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Servicio <span className="text-red-500">*</span>
              </label>
              <select
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.id_service ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
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
                <p className="text-red-500 text-xs mt-1">{errors.id_service.message}</p>
              )}
            </div>
          )}

          {/* Nombre modalidad */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de modalidad <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                errors.mode_name ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              placeholder="Plan Básico"
              {...register("mode_name")}
            />
            {errors.mode_name && (
              <p className="text-red-500 text-xs mt-1">{errors.mode_name.message}</p>
            )}
          </div>

          {/* Horas + Dirección */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Horas por día <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.mode_hours ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("mode_hours", { valueAsNumber: true })}
              />
              {errors.mode_hours && (
                <p className="text-red-500 text-xs mt-1">{errors.mode_hours.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dirección del punto <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.address_point ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                placeholder="Carrera 10 #20-30"
                {...register("address_point")}
              />
              {errors.address_point && (
                <p className="text-red-500 text-xs mt-1">{errors.address_point.message}</p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Precios del servicio</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Precio por recogida (nosotros vamos al cliente)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none ${
                      errors.mode_price_pickup ? "border-red-400 bg-red-50" : "border-slate-200"
                    }`}
                    placeholder="0.00"
                    {...register("mode_price_pickup", { valueAsNumber: true })}
                  />
                </div>
                {errors.mode_price_pickup && (
                  <p className="text-red-500 text-xs mt-1">{errors.mode_price_pickup.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Precio por entrega (el cliente nos trae al adulto)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none ${
                      errors.mode_price_dropoff ? "border-red-400 bg-red-50" : "border-slate-200"
                    }`}
                    placeholder="0.00"
                    {...register("mode_price_dropoff", { valueAsNumber: true })}
                  />
                </div>
                {errors.mode_price_dropoff && (
                  <p className="text-red-500 text-xs mt-1">{errors.mode_price_dropoff.message}</p>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
