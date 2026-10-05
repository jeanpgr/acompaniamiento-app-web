import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDetailsDaycarePage,
  createDetailDaycare,
  updateDetailDaycare,
  deleteDetailDaycare,
  type DetailDaycare,
  type CreateDetailDaycareInput,
} from "@/api/details-daycare";
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
import Badge from "@/components/ui/Badge";
import { invalidateResource } from "@/lib/invalidate";

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
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailDaycare | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  // Con ?service= se listan solo las del servicio (filtro en el servidor).
  const pager = useCursorPagination(
    ["detail-daycare", { id_service: serviceId, search: debouncedSearch }],
    (cursor) =>
      getDetailsDaycarePage(cursor, {
        id_service: serviceId ?? undefined,
        search: debouncedSearch,
      }),
  );
  const { items, isLoading } = pager;

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const daycareServices = services.filter(
    (s) => s.type === "GUARDERIA" && s.active,
  );
  const currentService = serviceId
    ? services.find((s) => s.id === serviceId)
    : null;

  const createMut = useMutation({
    mutationFn: createDetailDaycare,
    onSuccess: () => {
      invalidateResource(qc, "detail-daycare");
      setModalOpen(false);
      toast.success("Modalidad de guardería creada");
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
      data: Partial<CreateDetailDaycareInput>;
    }) => updateDetailDaycare(id, data),
    onSuccess: () => {
      invalidateResource(qc, "detail-daycare");
      setModalOpen(false);
      toast.success("Modalidad actualizada");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al actualizar")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailDaycare,
    onSuccess: () => {
      invalidateResource(qc, "detail-daycare");
      toast.success("Modalidad eliminada");
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
      ...(data.mode_price_pickup != null && {
        price_pickup: data.mode_price_pickup,
      }),
      ...(data.mode_price_dropoff != null && {
        price_dropoff: data.mode_price_dropoff,
      }),
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
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay modalidades de guardería registradas";
  const renderActions = (item: DetailDaycare) => (
    <>
      <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
        <Pencil size={12} /> Editar
      </Button>
      <Button
        size="sm"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === item.id}
        onClick={async () => {
          if (
            await confirm({ title: "¿Eliminar esta modalidad de guardería?" })
          )
            deleteMut.mutate(item.id);
        }}
      >
        <Trash2 size={12} /> Eliminar
      </Button>
    </>
  );

  const formatPrice = (val?: number) =>
    val != null ? `$ ${val.toLocaleString("es-CO")}` : null;

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
              ? `Guardería · ${currentService.name}`
              : "Detalles de guardería"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {serviceId
              ? "Modalidades y planes de este servicio de guardería"
              : "Gestiona planes y modalidades del servicio de guardería"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva modalidad
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por modalidad o dirección"
          label="Buscar modalidades"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando modalidades…" />
        ) : view === "grid" ? (
          <CardGrid empty={items.length === 0 && emptyText}>
            {items.map((item) => (
              <GridCard key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-ink text-sm">
                    {item.service_mode?.name ?? "Modalidad sin nombre"}
                  </h2>
                  <Badge variant={item.active ? "success" : "danger"}>
                    {item.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <CardFields>
                  <CardField label="Horas / día">
                    {item.service_mode?.hours != null
                      ? `${item.service_mode.hours} h`
                      : "—"}
                  </CardField>
                  <CardField label="Precio recogida">
                    {formatPrice(item.service_mode?.price_pickup) ?? "—"}
                  </CardField>
                  <CardField label="Precio entrega">
                    {formatPrice(item.service_mode?.price_dropoff) ?? "—"}
                  </CardField>
                  <CardField label="Dirección">
                    {item.address_point ?? "—"}
                  </CardField>
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
                  Modalidad
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Horas / día
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Precio recogida
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Precio entrega
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <MapPin size={12} /> Dirección
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Estado
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
                  <td className="px-5 py-3.5 font-medium text-ink text-sm">
                    {item.service_mode?.name ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {item.service_mode?.hours != null ? (
                      `${item.service_mode.hours} h`
                    ) : (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {formatPrice(item.service_mode?.price_pickup) ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {formatPrice(item.service_mode?.price_dropoff) ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3 max-w-44 truncate">
                    {item.address_point ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={item.active ? "success" : "danger"}>
                      {item.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">{renderActions(item)}</div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
        title={editTarget ? "Editar modalidad" : "Nueva modalidad de guardería"}
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
              {editTarget ? "Guardar cambios" : "Crear modalidad"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Servicio */}
          {!serviceId && (
            <div>
              <label
                htmlFor="daycaredetail-id_service"
                className="block text-sm font-medium text-ink mb-1"
              >
                Servicio <span className="text-danger-fg">*</span>
              </label>
              <select
                id="daycaredetail-id_service"
                className="field"
                aria-invalid={!!errors.id_service}
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
                <p className="text-danger-fg text-xs mt-1">
                  {errors.id_service.message}
                </p>
              )}
            </div>
          )}

          {/* Nombre modalidad */}
          <div>
            <label
              htmlFor="daycaredetail-mode_name"
              className="block text-sm font-medium text-ink mb-1"
            >
              Nombre de modalidad <span className="text-danger-fg">*</span>
            </label>
            <input
              id="daycaredetail-mode_name"
              className="field"
              aria-invalid={!!errors.mode_name}
              placeholder="Plan Básico"
              {...register("mode_name")}
            />
            {errors.mode_name && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.mode_name.message}
              </p>
            )}
          </div>

          {/* Horas + Dirección */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="daycaredetail-mode_hours"
                className="block text-sm font-medium text-ink mb-1"
              >
                Horas por día <span className="text-danger-fg">*</span>
              </label>
              <input
                id="daycaredetail-mode_hours"
                type="number"
                min={0}
                className="field"
                aria-invalid={!!errors.mode_hours}
                {...register("mode_hours", { valueAsNumber: true })}
              />
              {errors.mode_hours && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.mode_hours.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="daycaredetail-address_point"
                className="block text-sm font-medium text-ink mb-1"
              >
                Dirección del punto <span className="text-danger-fg">*</span>
              </label>
              <input
                id="daycaredetail-address_point"
                className="field"
                aria-invalid={!!errors.address_point}
                placeholder="Carrera 10 #20-30"
                {...register("address_point")}
              />
              {errors.address_point && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.address_point.message}
                </p>
              )}
            </div>
          </div>

          {/* Precios */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">
              Precios del servicio
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="daycaredetail-mode_price_pickup"
                  className="block text-xs text-ink-2 mb-1"
                >
                  Precio por recogida (nosotros vamos al cliente)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                    $
                  </span>
                  <input
                    id="daycaredetail-mode_price_pickup"
                    type="number"
                    min={0}
                    step="0.01"
                    className="field pl-7 pr-3"
                    aria-invalid={!!errors.mode_price_pickup}
                    placeholder="0.00"
                    {...register("mode_price_pickup", { valueAsNumber: true })}
                  />
                </div>
                {errors.mode_price_pickup && (
                  <p className="text-danger-fg text-xs mt-1">
                    {errors.mode_price_pickup.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="daycaredetail-mode_price_dropoff"
                  className="block text-xs text-ink-2 mb-1"
                >
                  Precio por entrega (el cliente nos trae al adulto)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                    $
                  </span>
                  <input
                    id="daycaredetail-mode_price_dropoff"
                    type="number"
                    min={0}
                    step="0.01"
                    className="field pl-7 pr-3"
                    aria-invalid={!!errors.mode_price_dropoff}
                    placeholder="0.00"
                    {...register("mode_price_dropoff", { valueAsNumber: true })}
                  />
                </div>
                {errors.mode_price_dropoff && (
                  <p className="text-danger-fg text-xs mt-1">
                    {errors.mode_price_dropoff.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
