import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock, Video, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsTrainingPage,
  createDetailTraining,
  updateDetailTraining,
  deleteDetailTraining,
  type DetailTraining,
  type CreateDetailTrainingInput,
} from "@/api/details-training";
import { getServices } from "@/api/services";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
  CardActions,
} from "@/components/ui/CardGrid";
import CursorPagination from "@/components/ui/CursorPagination";

const schema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  topic: z.string().min(1, "El tema es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  date_time: z.string().min(1, "Fecha y hora requeridas"),
  duration: z.number().int().positive("Debe ser un número positivo"),
  link_meet: z.string().url("URL inválida").optional().or(z.literal("")),
  price: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
});

type FormData = z.infer<typeof schema>;

export default function TrainingDetailPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTraining | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  // Con ?service= se listan solo las del servicio (filtro en el servidor).
  const pager = useCursorPagination(
    ["detail-training", { id_service: serviceId, search: debouncedSearch }],
    (cursor) =>
      getDetailsTrainingPage(cursor, {
        id_service: serviceId ?? undefined,
        search: debouncedSearch,
      }),
  );
  const { items, isLoading } = pager;

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const trainingServices = services.filter(
    (s) => s.type === "CAPACITACION" && s.active,
  );
  const currentService = serviceId
    ? services.find((s) => s.id === serviceId)
    : null;

  const createMut = useMutation({
    mutationFn: createDetailTraining,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      setModalOpen(false);
      toast.success("Capacitación creada correctamente");
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
      data: Partial<CreateDetailTrainingInput>;
    }) => updateDetailTraining(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      setModalOpen(false);
      toast.success("Capacitación actualizada");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al actualizar")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTraining,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["detail-training"] });
      toast.success("Capacitación eliminada");
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
    reset({
      id_service: serviceId ?? "",
      topic: "",
      description: "",
      date_time: "",
      duration: 60,
      link_meet: "",
      price: undefined,
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
      price: item.price != null ? Number(item.price) : undefined,
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateDetailTrainingInput = {
      id_service: data.id_service,
      topic: data.topic,
      description: data.description,
      date_time: new Date(data.date_time).toISOString(),
      duration: data.duration,
      ...(data.link_meet ? { link_meet: data.link_meet } : {}),
      ...(data.price !== undefined ? { price: data.price.toFixed(2) } : {}),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay capacitaciones registradas";

  const formatDateTime = (item: DetailTraining) =>
    new Date(item.date_time).toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderPrice = (item: DetailTraining) =>
    item.price != null ? (
      <span className="font-medium text-ink">
        ${Number(item.price).toFixed(2)}
      </span>
    ) : (
      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg font-medium">
        Gratuito
      </span>
    );

  const renderLink = (item: DetailTraining) =>
    item.link_meet ? (
      <a
        href={item.link_meet}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-info-fg hover:underline truncate max-w-36 block"
      >
        {item.link_meet}
      </a>
    ) : (
      <span className="text-ink-3 italic text-xs">—</span>
    );

  const renderActions = (item: DetailTraining) => (
    <>
      <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
        <Pencil size={12} /> Editar
      </Button>
      <Button
        size="sm"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === item.id}
        onClick={async () => {
          if (await confirm({ title: `¿Eliminar "${item.topic}"?` }))
            deleteMut.mutate(item.id);
        }}
      >
        <Trash2 size={12} /> Eliminar
      </Button>
    </>
  );

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
              ? `Capacitación · ${currentService.name}`
              : "Detalles de capacitación"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {serviceId
              ? "Talleres y sesiones de este servicio de capacitación"
              : "Gestiona talleres y cursos de formación"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva capacitación
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por tema o descripción"
          label="Buscar capacitaciones"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando capacitaciones…" />
        ) : view === "grid" ? (
          <CardGrid empty={items.length === 0 && emptyText}>
            {items.map((item) => (
              <GridCard key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-ink text-sm">{item.topic}</h2>
                  {renderPrice(item)}
                </div>
                {item.description && (
                  <p className="text-sm text-ink-3 line-clamp-3">
                    {item.description}
                  </p>
                )}
                <CardFields>
                  <CardField label="Fecha">{formatDateTime(item)}</CardField>
                  <CardField label="Duración">{item.duration}</CardField>
                  <CardField label="Enlace">{renderLink(item)}</CardField>
                </CardFields>
                <CardActions>{renderActions(item)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Tema
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Fecha y hora
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> Duración (min)
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Precio
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Video size={12} /> Enlace Meet
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line/70 hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ink text-sm">{item.topic}</p>
                    {item.description && (
                      <p className="text-xs text-ink-3 truncate max-w-52">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {formatDateTime(item)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-2">
                    {item.duration}
                  </td>
                  <td className="px-5 py-3.5 text-sm">{renderPrice(item)}</td>
                  <td className="px-5 py-3.5">{renderLink(item)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">{renderActions(item)}</div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!isLoading && <CursorPagination pager={pager} />}
      </div>

      {/* Modal */}
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
          {/* Servicio — oculto si viene del contexto de servicio */}
          {!serviceId && (
            <div>
              <label
                htmlFor="trainingdetail-id_service"
                className="block text-sm font-medium text-ink mb-1"
              >
                Servicio <span className="text-danger-fg">*</span>
              </label>
              <select
                id="trainingdetail-id_service"
                className="field"
                aria-invalid={!!errors.id_service}
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
                <p className="text-danger-fg text-xs mt-1">
                  {errors.id_service.message}
                </p>
              )}
            </div>
          )}

          {/* Tema */}
          <div>
            <label
              htmlFor="trainingdetail-topic"
              className="block text-sm font-medium text-ink mb-1"
            >
              Tema <span className="text-danger-fg">*</span>
            </label>
            <input
              id="trainingdetail-topic"
              className="field"
              aria-invalid={!!errors.topic}
              placeholder="Manejo de tecnología"
              {...register("topic")}
            />
            {errors.topic && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.topic.message}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="trainingdetail-description"
              className="block text-sm font-medium text-ink mb-1"
            >
              Descripción <span className="text-danger-fg">*</span>
            </label>
            <textarea
              id="trainingdetail-description"
              rows={2}
              className="field resize-none"
              aria-invalid={!!errors.description}
              placeholder="Descripción del tema"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Fecha + Duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="trainingdetail-date_time"
                className="block text-sm font-medium text-ink mb-1"
              >
                Fecha y hora <span className="text-danger-fg">*</span>
              </label>
              <input
                id="trainingdetail-date_time"
                type="datetime-local"
                className="field"
                aria-invalid={!!errors.date_time}
                {...register("date_time")}
              />
              {errors.date_time && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.date_time.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="trainingdetail-duration"
                className="block text-sm font-medium text-ink mb-1"
              >
                Duración (min) <span className="text-danger-fg">*</span>
              </label>
              <input
                id="trainingdetail-duration"
                type="number"
                min={1}
                className="field"
                aria-invalid={!!errors.duration}
                {...register("duration", { valueAsNumber: true })}
              />
              {errors.duration && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.duration.message}
                </p>
              )}
            </div>
          </div>

          {/* Precio */}
          <div>
            <label
              htmlFor="trainingdetail-price"
              className="block text-sm font-medium text-ink mb-1"
            >
              Precio
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                $
              </span>
              <input
                id="trainingdetail-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="field pl-6 pr-3"
                aria-invalid={!!errors.price}
                {...register("price", {
                  setValueAs: (v) =>
                    v === "" || v === null || Number.isNaN(Number(v))
                      ? undefined
                      : Number(v),
                })}
              />
            </div>
            {errors.price && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.price.message}
              </p>
            )}
            <p className="text-xs text-ink-3 mt-1">
              Deja vacío si el taller es gratuito
            </p>
          </div>

          {/* Enlace Meet */}
          <div>
            <label
              htmlFor="trainingdetail-link_meet"
              className="block text-sm font-medium text-ink mb-1"
            >
              Enlace Meet
            </label>
            <input
              id="trainingdetail-link_meet"
              className="field"
              aria-invalid={!!errors.link_meet}
              placeholder="https://meet.google.com/..."
              {...register("link_meet")}
            />
            {errors.link_meet && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.link_meet.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
