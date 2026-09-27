import { getErrorMessage } from "@/api/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronRight, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getServices,
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

// ── Validation ──────────────────────────────────────────────────
const schema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(30, "Máximo 30 caracteres"),
  description: z.string().max(250, "Máximo 250 caracteres").optional(),
  type: z
    .enum(["ACOMPAÑAMIENTO", "TURISMO", "CAPACITACION", "GUARDERIA"])
    .optional(),
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.badge}`}
    >
      {SERVICE_TYPE_STYLE[type] ? cfg.label : type}
    </span>
  );
}

function sanitizePayload(data: FormData): CreateServiceInput {
  const out: CreateServiceInput = { name: data.name.trim() };
  if (data.description?.trim()) out.description = data.description.trim();
  if (data.type) out.type = data.type;
  if (data.price?.trim()) out.price = data.price.trim();
  return out;
}

// ── Page ────────────────────────────────────────────────────────
export default function ServicesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"all" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setModalOpen(false);
      toast.success("Servicio creado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al crear el servicio")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateService(id, sanitizePayload(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setModalOpen(false);
      toast.success("Servicio actualizado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al actualizar el servicio")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al eliminar el servicio")),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

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

  const active = services.filter((s) => s.active);
  const inactive = services.filter((s) => !s.active);
  const displayed = tab === "all" ? active : inactive;
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Gestión de servicios
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Administra el catálogo de servicios. Para tipos con detalle
            (Turismo, Capacitación, Guardería) usa "Gestionar" para ingresar su
            información específica.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo servicio
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {(
          [
            { key: "all", label: `Activos (${active.length})` },
            { key: "inactive", label: `Inactivos (${inactive.length})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-primary bg-primary text-white rounded-t-lg"
                : "border-transparent text-ink-3 hover:text-ink"
            }`}
            aria-pressed={tab === key}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando servicios…" />
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Servicio
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Tipo
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Precio base
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Creación
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => {
                const hasDetail = s.type && s.type !== "ACOMPAÑAMIENTO";
                return (
                  <tr
                    key={s.id}
                    className="border-b border-line/70 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-ink-3 shrink-0" />
                        <div>
                          <p className="font-medium text-ink text-sm">
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
                    <td className="px-5 py-3.5">
                      <TypeBadge type={s.type} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">
                      {s.price ? (
                        `$ ${s.price}`
                      ) : (
                        <span className="text-ink-3 italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">
                      {new Date(s.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2 flex-wrap">
                        {hasDetail && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleManageDetails(s)}
                          >
                            <ChevronRight size={12} /> Gestionar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil size={12} /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger-soft"
                          loading={
                            deleteMut.isPending && deleteMut.variables === s.id
                          }
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `¿Eliminar el servicio "${s.name}"?`,
                              })
                            )
                              deleteMut.mutate(s.id);
                          }}
                        >
                          <Trash2 size={12} /> Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    No hay servicios en esta categoría
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? "Editar servicio" : "Nuevo servicio"}
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
              {editTarget ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="services-name"
              className="block text-sm font-medium text-ink mb-1"
            >
              Nombre <span className="text-danger-fg">*</span>
            </label>
            <input
              id="services-name"
              className="field"
              aria-invalid={!!errors.name}
              placeholder="Nombre del servicio"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="services-description"
              className="block text-sm font-medium text-ink mb-1"
            >
              Descripción
            </label>
            <textarea
              id="services-description"
              rows={3}
              className="field resize-none"
              placeholder="Descripción del servicio"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="services-type"
                className="block text-sm font-medium text-ink mb-1"
              >
                Tipo
              </label>
              <select
                id="services-type"
                className="field"
                {...register("type")}
              >
                <option value="">Seleccionar tipo</option>
                <option value="ACOMPAÑAMIENTO">Acompañamiento</option>
                <option value="TURISMO">Turismo</option>
                <option value="CAPACITACION">Capacitación</option>
                <option value="GUARDERIA">Guardería</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="services-price"
                className="block text-sm font-medium text-ink mb-1"
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
                <p className="text-danger-fg text-xs mt-1">
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
