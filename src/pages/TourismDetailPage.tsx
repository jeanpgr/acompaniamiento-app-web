import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Users, Clock, ArrowLeft, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsTourism,
  getDetailsTourismByService,
  createDetailTourism,
  updateDetailTourism,
  deleteDetailTourism,
  type DetailTourism,
  type CreateDetailTourismInput,
} from "@/api/details-tourism";
import { getServices } from "@/api/services";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  date_output: z.string().min(1, "Fecha de salida requerida"),
  date_arrival: z.string().min(1, "Fecha de llegada requerida"),
  quotas: z.number().int().positive("Debe ser un número positivo"),
  meeting_point_address: z.string().optional(),
  price_adult: z.number({ message: "Ingresa un número" }).nonnegative("Debe ser 0 o mayor").optional(),
  price_child: z.number({ message: "Ingresa un número" }).nonnegative("Debe ser 0 o mayor").optional(),
  price_senior: z.number({ message: "Ingresa un número" }).nonnegative("Debe ser 0 o mayor").optional(),
});

type FormData = z.infer<typeof schema>;

interface ItineraryStop {
  hour: string;
  place: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function TourismDetailPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTourism | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryStop[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const { data: items = [], isLoading } = useQuery({
    queryKey: serviceId ? ["detail-tourism", serviceId] : ["detail-tourism"],
    queryFn: () =>
      serviceId ? getDetailsTourismByService(serviceId) : getDetailsTourism(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const tourismServices = services.filter((s) => s.type === "TURISMO" && s.active);
  const currentService = serviceId ? services.find((s) => s.id === serviceId) : null;

  const createMut = useMutation({
    mutationFn: createDetailTourism,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      setModalOpen(false);
      toast.success("Excursión creada correctamente");
    },
    onError: (err: unknown) =>
      toast.error(
        getErrorMessage(err, "Error al crear"),
      ),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDetailTourismInput> }) =>
      updateDetailTourism(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      setModalOpen(false);
      toast.success("Excursión actualizada");
    },
    onError: (err: unknown) =>
      toast.error(
        getErrorMessage(err, "Error al actualizar"),
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
        getErrorMessage(err, "Error al eliminar"),
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
    setItinerary([]);
    reset({
      id_service: serviceId ?? "",
      name: "",
      description: "",
      date_output: "",
      date_arrival: "",
      quotas: 1,
      meeting_point_address: "",
      price_adult: undefined,
      price_child: undefined,
      price_senior: undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (item: DetailTourism) => {
    setEditTarget(item);
    setItinerary(
      (item.itinerary ?? []).map((s) => ({
        hour: s.hour ?? "",
        place: s.place ?? "",
      })),
    );
    reset({
      id_service: item.id_service,
      name: item.name,
      description: item.description ?? "",
      date_output: item.date_output?.slice(0, 16) ?? "",
      date_arrival: item.date_arrival?.slice(0, 16) ?? "",
      quotas: item.quotas,
      meeting_point_address: item.meeting_point_address ?? "",
      price_adult: item.prices?.adult,
      price_child: item.prices?.child,
      price_senior: item.prices?.senior,
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const stops = itinerary.filter((s) => s.hour || s.place);
    const prices: Record<string, number> = {};
    if (data.price_adult !== undefined) prices.adult = data.price_adult;
    if (data.price_child !== undefined) prices.child = data.price_child;
    if (data.price_senior !== undefined) prices.senior = data.price_senior;
    const payload: CreateDetailTourismInput = {
      id_service: data.id_service,
      name: data.name,
      description: data.description,
      date_output: new Date(data.date_output).toISOString(),
      date_arrival: new Date(data.date_arrival).toISOString(),
      quotas: data.quotas,
      quotas_available: editTarget ? editTarget.quotas_available : data.quotas,
      ...(data.meeting_point_address?.trim() && {
        meeting_point_address: data.meeting_point_address,
      }),
      ...(stops.length > 0 && { itinerary: stops }),
      ...(Object.keys(prices).length > 0 && { prices }),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const addStop = () => setItinerary((prev) => [...prev, { hour: "", place: "" }]);
  const removeStop = (i: number) => setItinerary((prev) => prev.filter((_, idx) => idx !== i));
  const updateStop = (i: number, field: keyof ItineraryStop, value: string) =>
    setItinerary((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });

  const isPending = createMut.isPending || updateMut.isPending;

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
            {currentService ? `Turismo · ${currentService.name}` : "Detalles de turismo"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {serviceId
              ? "Excursiones y salidas de este servicio turístico"
              : "Gestiona excursiones y salidas turísticas"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva excursión
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando excursiones...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Excursión</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Fechas</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Users size={12} /> Cupos
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Tarifas</th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Punto encuentro
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> Itinerario
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const hasItinerary = item.itinerary && item.itinerary.length > 0;
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className="border-b border-slate-50 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-slate-400 truncate max-w-52">{item.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        <div>Salida: {fmt(item.date_output)}</div>
                        <div>Llegada: {fmt(item.date_arrival)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        <span className="font-medium">{item.quotas_available}</span>
                        <span className="text-slate-400"> / {item.quotas}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {item.prices &&
                        (item.prices.adult !== undefined ||
                          item.prices.child !== undefined ||
                          item.prices.senior !== undefined) ? (
                          <div className="space-y-0.5">
                            {item.prices.adult !== undefined && (
                              <div>
                                <span className="text-slate-400">Adulto:</span>{" "}
                                <span className="font-medium">${item.prices.adult.toFixed(2)}</span>
                              </div>
                            )}
                            {item.prices.child !== undefined && (
                              <div>
                                <span className="text-slate-400">Niño:</span>{" "}
                                <span className="font-medium">${item.prices.child.toFixed(2)}</span>
                              </div>
                            )}
                            {item.prices.senior !== undefined && (
                              <div>
                                <span className="text-slate-400">3ra edad:</span>{" "}
                                <span className="font-medium">${item.prices.senior.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 max-w-40 truncate">
                        {item.meeting_point_address ?? (
                          <span className="text-slate-300 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {hasItinerary ? (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {item.itinerary!.length} parada{item.itinerary!.length !== 1 ? "s" : ""}
                          </button>
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
                            loading={deleteMut.isPending && deleteMut.variables === item.id}
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
                    {isExpanded && hasItinerary && (
                      <tr key={`${item.id}-itinerary`} className="bg-slate-50/70">
                        <td colSpan={7} className="px-8 py-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                            Itinerario
                          </p>
                          <div className="flex flex-col gap-0">
                            {item.itinerary!.map((stop, i) => (
                              <div key={i} className="flex items-start gap-3">
                                {/* línea de tiempo */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className="w-2 h-2 rounded-full mt-1 shrink-0"
                                    style={{ backgroundColor: "#1D3461" }}
                                  />
                                  {i < item.itinerary!.length - 1 && (
                                    <div className="w-px flex-1 bg-slate-200 my-1" style={{ minHeight: 16 }} />
                                  )}
                                </div>
                                <div className="pb-3">
                                  {stop.hour && (
                                    <span className="text-xs font-semibold text-slate-600 mr-2">
                                      {stop.hour}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-700">{stop.place}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No hay excursiones registradas
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
        title={editTarget ? "Editar excursión" : "Nueva excursión"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear excursión"}
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
                {tourismServices.map((s) => (
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

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de la excursión <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                errors.name ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              placeholder="Excursión Cartagena"
              {...register("name")}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none ${
                errors.description ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              placeholder="Descripción de la excursión"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha salida <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.date_output ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("date_output")}
              />
              {errors.date_output && (
                <p className="text-red-500 text-xs mt-1">{errors.date_output.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha llegada <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.date_arrival ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("date_arrival")}
              />
              {errors.date_arrival && (
                <p className="text-red-500 text-xs mt-1">{errors.date_arrival.message}</p>
              )}
            </div>
          </div>

          {/* Cupos + Punto encuentro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cupos totales <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                  errors.quotas ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("quotas", { valueAsNumber: true })}
              />
              {errors.quotas && (
                <p className="text-red-500 text-xs mt-1">{errors.quotas.message}</p>
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

          {/* Tarifas por categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tarifas por persona
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { field: "price_adult", label: "Adulto" },
                  { field: "price_child", label: "Niño" },
                  { field: "price_senior", label: "Tercera edad" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className={`w-full border rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none ${
                        errors[field] ? "border-red-400 bg-red-50" : "border-slate-200"
                      }`}
                      {...register(field, {
                        setValueAs: (v) =>
                          v === "" || v === null || Number.isNaN(Number(v))
                            ? undefined
                            : Number(v),
                      })}
                    />
                  </div>
                  {errors[field] && (
                    <p className="text-red-500 text-xs mt-1">{errors[field]?.message}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Deja vacía una categoría si no aplica para esta excursión
            </p>
          </div>

          {/* Itinerario */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Itinerario</label>
              <button
                type="button"
                onClick={addStop}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={12} /> Agregar parada
              </button>
            </div>
            {itinerary.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Sin paradas. Haz clic en "Agregar parada" para añadir.
              </p>
            ) : (
              <div className="space-y-2">
                {itinerary.map((stop, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={stop.hour}
                      onChange={(e) => updateStop(i, "hour", e.target.value)}
                      placeholder="09:00"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none w-20"
                    />
                    <input
                      value={stop.place}
                      onChange={(e) => updateStop(i, "place", e.target.value)}
                      placeholder="Lugar o actividad"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
