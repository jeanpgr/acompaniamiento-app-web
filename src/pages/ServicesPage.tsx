import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronRight, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getServicesPage,
  createService,
  updateService,
  deleteService,
  type Service,
  type ServiceType,
  type CreateServiceInput,
} from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { SERVICE_TYPE_STYLE, serviceTypeStyle } from "@/lib/serviceTypes";
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
import { useDiscardGuard } from "@/hooks/useDiscardGuard";

// ── Validation ──────────────────────────────────────────────────
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(30, "Máximo 30 caracteres"),
  description: z.string().max(250, "Máximo 250 caracteres").optional(),
  // Obligatorio: la app decide con el tipo qué pantalla abrir y el panel
  // qué detalles (excursiones, talleres, planes) gestionar. Antes el select
  // vacío ("") fallaba la validación sin mostrar error y "Crear" no hacía nada.
  type: z.enum(["ACOMPAÑAMIENTO", "TURISMO", "CAPACITACION", "GUARDERIA"], {
    message: "Selecciona el tipo de servicio",
  }),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato inválido (ej. 50 o 50.00)")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

// ── Type config ─────────────────────────────────────────────────
// Ruta de detalle por tipo; los colores vienen de lib/serviceTypes.
const TYPE_DETAIL_ROUTE: Record<string, string | null> = {
  ACOMPAÑAMIENTO: null,
  TURISMO: "/tourism-details",
  CAPACITACION: "/training-details",
  GUARDERIA: "/daycare-details",
};

function TypeBadge({ type }: { type: ServiceType | null }) {
  if (!type) return <span className="text-ink-3 text-xs">—</span>;
  const cfg = serviceTypeStyle(type);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}
    >
      {SERVICE_TYPE_STYLE[type] ? cfg.label : type}
    </span>
  );
}

function sanitizePayload(data: FormData): CreateServiceInput {
  const out: CreateServiceInput = { name: data.name.trim() };
  if (data.description?.trim()) out.description = data.description.trim();
  out.type = data.type;
  if (data.price?.trim()) out.price = data.price.trim();
  return out;
}

// ── Page ────────────────────────────────────────────────────────
export default function ServicesPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  // La pestaña filtra en el servidor; los conteos llegan con la página.
  const activeFilter = tab === "all";
  const pager = useCursorPagination(
    ["services", { active: activeFilter, search: debouncedSearch }],
    (cursor) =>
      getServicesPage(cursor, {
        active: activeFilter,
        search: debouncedSearch,
      }),
  );
  const { items: displayed, isLoading } = pager;

  const createMut = useMutation({
    mutationFn: createService,
    meta: {
      invalidates: "services",
      errorMessage: "Error al crear el servicio",
    },
    onSuccess: (created) => {
      setModalOpen(false);
      // Turismo, Capacitación y Guardería necesitan sus detalles para
      // aparecer con contenido en la app: se ofrece ir directo a cargarlos.
      const route = created.type ? TYPE_DETAIL_ROUTE[created.type] : null;
      toast.success(
        "Servicio creado correctamente",
        route
          ? {
              description:
                "Agrega ahora sus detalles para que se vea en la app.",
              action: {
                label: "Agregar detalles",
                onClick: () => navigate(`${route}?service=${created.id}`),
              },
            }
          : undefined,
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateService(id, sanitizePayload(data)),
    meta: {
      invalidates: "services",
      successMessage: "Servicio actualizado correctamente",
      errorMessage: "Error al actualizar el servicio",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    meta: {
      invalidates: "services",
      successMessage: "Servicio eliminado",
      errorMessage: "Error al eliminar el servicio",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  // Cerrar con cambios sin guardar pide confirmación.
  const requestClose = useDiscardGuard(isDirty, () => setModalOpen(false));

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: "", description: "", type: undefined, price: "" });
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditTarget(s);
    reset({
      name: s.name ?? "",
      description: s.description ?? "",
      type: s.type ?? undefined,
      price: s.price ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data });
    } else {
      createMut.mutate(sanitizePayload(data));
    }
  };

  const handleManageDetails = (s: Service) => {
    const route = s.type ? TYPE_DETAIL_ROUTE[s.type] : null;
    if (route) {
      navigate(`${route}?service=${s.id}`);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay servicios en esta categoría";

  const renderActions = (s: Service) => (
    <>
      {s.type && s.type !== "ACOMPAÑAMIENTO" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleManageDetails(s)}
        >
          <ChevronRight size={14} /> Gestionar
        </Button>
      )}
      <Button
        size="icon"
        aria-label={`Editar ${s.name}`}
        title="Editar"
        variant="secondary"
        onClick={() => openEdit(s)}
      >
        <Pencil size={16} aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        aria-label={`Eliminar ${s.name}`}
        title="Eliminar"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === s.id}
        onClick={async () => {
          if (await confirm({ title: `¿Eliminar el servicio "${s.name}"?` }))
            deleteMut.mutate(s.id);
        }}
      >
        <Trash2 size={16} aria-hidden="true" />
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Gestión de servicios
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Administra el catálogo de servicios. Para tipos con detalle
            (Turismo, Capacitación, Guardería) usa "Gestionar" para ingresar su
            información específica.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo servicio
        </Button>
      </div>

      {/* Tabs */}
      <div className="segmented mb-4">
        {(
          [
            { key: "all", label: `Activos (${pager.counts?.active ?? 0})` },
            {
              key: "inactive",
              label: `Inactivos (${pager.counts?.inactive ?? 0})`,
            },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="segment"
            aria-pressed={tab === key}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o descripción"
          label="Buscar servicios"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando servicios…" />
        ) : view === "grid" ? (
          <CardGrid empty={displayed.length === 0 && emptyText}>
            {displayed.map((s) => (
              <GridCard key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase size={18} className="text-primary shrink-0" />
                    <h2 className="font-bold text-ink text-base line-clamp-2 wrap-break-word">
                      {s.name}
                    </h2>
                  </div>
                  <TypeBadge type={s.type} />
                </div>
                <p className="text-sm text-ink-3 line-clamp-3">
                  {s.description ?? "Sin descripción"}
                </p>
                <CardFields>
                  <CardField label="Precio base">
                    {s.price ? `$ ${s.price}` : "—"}
                  </CardField>
                  <CardField label="Creación">
                    {new Date(s.created_at).toLocaleDateString("es-CO")}
                  </CardField>
                </CardFields>
                <CardActions>{renderActions(s)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Servicio
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Tipo
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Precio base
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Creación
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line/70 transition-colors hover:bg-primary-soft/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Briefcase size={18} className="text-primary shrink-0" />
                      <div>
                        <p className="font-semibold text-ink text-sm">
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="text-xs text-ink-3 truncate max-w-56">
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <TypeBadge type={s.type} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-3">
                    {s.price ? (
                      `$ ${s.price}`
                    ) : (
                      <span className="text-ink-3 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-3">
                    {new Date(s.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2 flex-wrap">
                      {renderActions(s)}
                    </div>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-ink-3 text-[15px]"
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

      {/* Legend */}
      <p className="text-xs text-ink-3 mt-3">
        Los servicios de tipo <strong>Turismo</strong>,{" "}
        <strong>Capacitación</strong> y <strong>Guardería</strong> requieren
        ingresar sus detalles específicos usando el botón{" "}
        <strong>Gestionar</strong>.
      </p>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !isPending && requestClose()}
        title={editTarget ? "Editar servicio" : "Nuevo servicio"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={requestClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="services-name"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Nombre <span className="text-danger-fg">*</span>
            </label>
            <input
              id="services-name"
              className="field"
              aria-invalid={!!errors.name}
              placeholder="Nombre del servicio"
              maxLength={30}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="services-description"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Descripción
            </label>
            <textarea
              id="services-description"
              rows={3}
              className="field resize-none"
              aria-invalid={!!errors.description}
              placeholder="Descripción del servicio"
              maxLength={250}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="services-type"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Tipo <span className="text-danger-fg">*</span>
              </label>
              <select
                id="services-type"
                className="field"
                aria-invalid={!!errors.type}
                {...register("type")}
              >
                <option value="">Seleccionar tipo</option>
                <option value="ACOMPAÑAMIENTO">Acompañamiento</option>
                <option value="TURISMO">Turismo</option>
                <option value="CAPACITACION">Capacitación</option>
                <option value="GUARDERIA">Guardería</option>
              </select>
              {errors.type && (
                <p className="text-danger-fg text-xs font-semibold mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="services-price"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Precio base
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                  $
                </span>
                <input
                  id="services-price"
                  className="field pl-7 pr-3"
                  aria-invalid={!!errors.price}
                  placeholder="0.00"
                  {...register("price")}
                />
              </div>
              {errors.price && (
                <p className="text-danger-fg text-xs font-semibold mt-1">
                  {errors.price.message}
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
