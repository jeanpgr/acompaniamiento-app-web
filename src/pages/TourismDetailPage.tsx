import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  date_output: z.string().min(1, "Fecha de salida requerida"),
  date_arrival: z.string().min(1, "Fecha de llegada requerida"),
  quotas: z.number().int().positive("Debe ser un número positivo"),
  meeting_point_address: z.string().optional(),
  price_adult: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
  price_child: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
  price_senior: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
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
  const confirm = useConfirm();
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

  const tourismServices = services.filter(
    (s) => s.type === "TURISMO" && s.active,
  );
  const currentService = serviceId
    ? services.find((s) => s.id === serviceId)
    : null;

  const createMut = useMutation({
    mutationFn: createDetailTourism,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      setModalOpen(false);
      toast.success("Excursión creada correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al crear")),
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
      toast.error(getErrorMessage(err, "Error al actualizar")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTourism,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-tourism"] });
      toast.success("Excursión eliminada");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al eliminar")),
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

  const addStop = () =>
    setItinerary((prev) => [...prev, { hour: "", place: "" }]);
  const removeStop = (i: number) =>
    setItinerary((prev) => prev.filter((_, idx) => idx !== i));
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          {serviceId && (
            <button
              onClick={() => navigate("/services")}
              className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink-2 mb-1 transition-colors"
            >
              <ArrowLeft size={12} /> Volver a servicios
            </button>
          )}
          <h1 className="text-xl font-semibold text-ink">
            {currentService
              ? `Turismo · ${currentService.name}`
              : "Detalles de turismo"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
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
      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando excursiones…" />
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Excursión
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Fechas
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Users size={12} /> Cupos
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Tarifas
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Punto encuentro
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> Itinerario
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const hasItinerary =
                  item.itinerary && item.itinerary.length > 0;
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-line/70 hover:bg-surface-2">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink text-sm">
                          {item.name}
                        </p>
                        {item.description && (
                          <p className="text-xs text-ink-3 truncate max-w-52">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-3">
                        <div>Salida: {fmt(item.date_output)}</div>
                        <div>Llegada: {fmt(item.date_arrival)}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-2">
                        <span className="font-medium">
                          {item.quotas_available}
                        </span>
                        <span className="text-ink-3"> / {item.quotas}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-2">
                        {item.prices &&
                        (item.prices.adult !== undefined ||
                          item.prices.child !== undefined ||
                          item.prices.senior !== undefined) ? (
                          <div className="space-y-0.5">
                            {item.prices.adult !== undefined && (
                              <div>
                                <span className="text-ink-3">Adulto:</span>{" "}
                                <span className="font-medium">
                                  ${item.prices.adult.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {item.prices.child !== undefined && (
                              <div>
                                <span className="text-ink-3">Niño:</span>{" "}
                                <span className="font-medium">
                                  ${item.prices.child.toFixed(2)}
                                </span>
                              </div>
                            )}
                            {item.prices.senior !== undefined && (
                              <div>
                                <span className="text-ink-3">3ra edad:</span>{" "}
                                <span className="font-medium">
                                  ${item.prices.senior.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-3 italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-3 max-w-40 truncate">
                        {item.meeting_point_address ?? (
                          <span className="text-ink-3 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {hasItinerary ? (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="flex items-center gap-1 text-xs font-medium text-info-fg hover:text-info-fg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown size={13} />
                            ) : (
                              <ChevronRight size={13} />
                            )}
                            {item.itinerary!.length} parada
                            {item.itinerary!.length !== 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-ink-3 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={12} /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger-soft"
                            loading={
                              deleteMut.isPending &&
                              deleteMut.variables === item.id
                            }
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: `¿Eliminar "${item.name}"?`,
                                })
                              )
                                deleteMut.mutate(item.id);
                            }}
                          >
                            <Trash2 size={12} /> Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && hasItinerary && (
                      <tr key={`${item.id}-itinerary`} className="bg-surface-2">
                        <td colSpan={7} className="px-8 py-4">
                          <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">
                            Itinerario
                          </p>
                          <div className="flex flex-col gap-0">
                            {item.itinerary!.map((stop, i) => (
                              <div key={i} className="flex items-start gap-3">
                                {/* línea de tiempo */}
                                <div className="flex flex-col items-center">
                                  <div className="w-2 h-2 rounded-full mt-1 shrink-0 bg-primary" />
                                  {i < item.itinerary!.length - 1 && (
                                    <div
                                      className="w-px flex-1 bg-line-strong my-1"
                                      style={{ minHeight: 16 }}
                                    />
                                  )}
                                </div>
                                <div className="pb-3">
                                  {stop.hour && (
                                    <span className="text-xs font-semibold text-ink-2 mr-2">
                                      {stop.hour}
                                    </span>
                                  )}
                                  <span className="text-xs text-ink">
                                    {stop.place}
                                  </span>
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
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
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
          {/* Servicio */}
          {!serviceId && (
            <div>
              <label
                htmlFor="tourismdetail-id_service"
                className="block text-sm font-medium text-ink mb-1"
              >
                Servicio <span className="text-danger-fg">*</span>
              </label>
              <select
                id="tourismdetail-id_service"
                className="field"
                aria-invalid={!!errors.id_service}
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
                <p className="text-danger-fg text-xs mt-1">
                  {errors.id_service.message}
                </p>
              )}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="tourismdetail-name"
              className="block text-sm font-medium text-ink mb-1"
            >
              Nombre de la excursión <span className="text-danger-fg">*</span>
            </label>
            <input
              id="tourismdetail-name"
              className="field"
              aria-invalid={!!errors.name}
              placeholder="Excursión Cartagena"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="tourismdetail-description"
              className="block text-sm font-medium text-ink mb-1"
            >
              Descripción <span className="text-danger-fg">*</span>
            </label>
            <textarea
              id="tourismdetail-description"
              rows={2}
              className="field resize-none"
              aria-invalid={!!errors.description}
              placeholder="Descripción de la excursión"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tourismdetail-date_output"
                className="block text-sm font-medium text-ink mb-1"
              >
                Fecha salida <span className="text-danger-fg">*</span>
              </label>
              <input
                id="tourismdetail-date_output"
                type="datetime-local"
                className="field"
                aria-invalid={!!errors.date_output}
                {...register("date_output")}
              />
              {errors.date_output && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.date_output.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="tourismdetail-date_arrival"
                className="block text-sm font-medium text-ink mb-1"
              >
                Fecha llegada <span className="text-danger-fg">*</span>
              </label>
              <input
                id="tourismdetail-date_arrival"
                type="datetime-local"
                className="field"
                aria-invalid={!!errors.date_arrival}
                {...register("date_arrival")}
              />
              {errors.date_arrival && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.date_arrival.message}
                </p>
              )}
            </div>
          </div>

          {/* Cupos + Punto encuentro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tourismdetail-quotas"
                className="block text-sm font-medium text-ink mb-1"
              >
                Cupos totales <span className="text-danger-fg">*</span>
              </label>
              <input
                id="tourismdetail-quotas"
                type="number"
                min={1}
                className="field"
                aria-invalid={!!errors.quotas}
                {...register("quotas", { valueAsNumber: true })}
              />
              {errors.quotas && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.quotas.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="tourismdetail-meeting_point_address"
                className="block text-sm font-medium text-ink mb-1"
              >
                Punto de encuentro
              </label>
              <input
                id="tourismdetail-meeting_point_address"
                className="field"
                placeholder="Terminal de transportes"
                {...register("meeting_point_address")}
              />
            </div>
          </div>

          {/* Tarifas por categoría */}
          <div>
            <p
              id="tourism-tarifas"
              className="block text-sm font-medium text-ink mb-2"
            >
              Tarifas por persona
            </p>
            <div
              role="group"
              aria-labelledby="tourism-tarifas"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {(
                [
                  { field: "price_adult", label: "Adulto" },
                  { field: "price_child", label: "Niño" },
                  { field: "price_senior", label: "Tercera edad" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field}>
                  <label
                    htmlFor={`tourism-${field}`}
                    className="block text-xs text-ink-2 mb-1"
                  >
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                      $
                    </span>
                    <input
                      id={`tourism-${field}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className="field pl-6 pr-3"
                      aria-invalid={!!errors[field]}
                      {...register(field, {
                        setValueAs: (v) =>
                          v === "" || v === null || Number.isNaN(Number(v))
                            ? undefined
                            : Number(v),
                      })}
                    />
                  </div>
                  {errors[field] && (
                    <p className="text-danger-fg text-xs mt-1">
                      {errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-3 mt-1.5">
              Deja vacía una categoría si no aplica para esta excursión
            </p>
          </div>

          {/* Itinerario */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="tourismdetail-campo-1"
                className="block text-sm font-medium text-ink"
              >
                Itinerario
              </label>
              <button
                type="button"
                onClick={addStop}
                className="flex items-center gap-1 text-xs text-info-fg hover:text-info-fg font-medium"
              >
                <Plus size={12} /> Agregar parada
              </button>
            </div>
            {itinerary.length === 0 ? (
              <p className="text-xs text-ink-3 italic">
                Sin paradas. Haz clic en "Agregar parada" para añadir.
              </p>
            ) : (
              <div className="space-y-2">
                {itinerary.map((stop, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      id="tourismdetail-campo-1"
                      value={stop.hour}
                      onChange={(e) => updateStop(i, "hour", e.target.value)}
                      placeholder="09:00"
                      className="border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none w-20"
                    />
                    <input
                      value={stop.place}
                      onChange={(e) => updateStop(i, "place", e.target.value)}
                      placeholder="Lugar o actividad"
                      className="border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      className="text-ink-3 hover:text-danger-fg transition-colors"
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
