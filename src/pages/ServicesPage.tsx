import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
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

// ── Validation ─────────────────────────────────────────────────
const schema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(30, "Máximo 30 caracteres"),
  description: z.string().max(250, "Máximo 250 caracteres").optional(),
  type: z
    .enum(["ACOMPAÑAMIENTO", "TURISMO", "CAPACITACION", "GUARDERIA"])
    .optional(),
  // price: stored as string "50.00" on backend; we collect as optional text
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato inválido (ej. 50 o 50.00)")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

// ── Type colours ───────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> =
  {
    ACOMPAÑAMIENTO: { bg: "#DBEAFE", text: "#1D4ED8", label: "Acompañamiento" },
    TURISMO: { bg: "#D1FAE5", text: "#065F46", label: "Turismo" },
    CAPACITACION: { bg: "#FEF9C3", text: "#854D0E", label: "Capacitación" },
    GUARDERIA: { bg: "#FCE7F3", text: "#9D174D", label: "Guardería" },
  };

function TypeBadge({ type }: { type: ServiceType | null }) {
  if (!type) return <span className="text-slate-400 text-xs">—</span>;
  const cfg = TYPE_COLORS[type] ?? {
    bg: "#F1F5F9",
    text: "#475569",
    label: type,
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function ServicesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  // ── Mutations ──────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setModalOpen(false);
      toast.success("Servicio creado correctamente");
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Error al crear el servicio",
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateService(id, sanitizePayload(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setModalOpen(false);
      toast.success("Servicio actualizado correctamente");
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Error al actualizar el servicio",
      );
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Servicio eliminado");
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Error al eliminar el servicio",
      );
    },
  });

  // ── Form ───────────────────────────────────────────────────
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

  const active = services.filter((s) => s.active);
  const inactive = services.filter((s) => !s.active);
  const displayed = tab === "all" ? active : inactive;
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Gestión de servicios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra el catálogo de servicios y su disponibilidad
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo servicio
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-200">
        {(
          [
            { key: "all", label: `Todos (${active.length})` },
            { key: "inactive", label: `Inactivos (${inactive.length})` },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? key === "all"
                  ? "border-current text-white rounded-t-lg"
                  : "border-current text-slate-700 bg-slate-100 rounded-t-lg"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            style={
              tab === key && key === "all"
                ? { backgroundColor: "#1D3461", borderColor: "#1D3461" }
                : {}
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          placeholder="Buscar..."
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none w-44"
        />
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
          Tipo <ChevronDown size={13} />
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-600">
          Fecha <ChevronDown size={13} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando servicios...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Servicio
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Tipo
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Precio
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Creación
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800 text-sm">
                      {s.name}
                    </p>
                    {s.description && (
                      <p className="text-xs text-slate-400 truncate max-w-52">
                        {s.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <TypeBadge type={s.type} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {s.price ? (
                      `$ ${s.price}`
                    ) : (
                      <span className="text-slate-300 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(s.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(s)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={
                          deleteMut.isPending && deleteMut.variables === s.id
                        }
                        onClick={() => {
                          if (
                            window.confirm(`¿Eliminar el servicio "${s.name}"?`)
                          ) {
                            deleteMut.mutate(s.id);
                          }
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-400 text-sm"
                  >
                    No hay servicios en esta categoría
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
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.name ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              placeholder="Nombre del servicio"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none ${
                errors.description
                  ? "border-red-400 bg-red-50"
                  : "border-slate-200"
              }`}
              placeholder="Descripción opcional del servicio"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tipo
            </label>
            <select
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                errors.type ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              {...register("type")}
            >
              <option value="">Seleccionar tipo</option>
              <option value="ACOMPAÑAMIENTO">Acompañamiento</option>
              <option value="TURISMO">Turismo</option>
              <option value="CAPACITACION">Capacitación</option>
              <option value="GUARDERIA">Guardería</option>
            </select>
            {errors.type && (
              <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                $
              </span>
              <input
                className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.price ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                placeholder="0.00"
                {...register("price")}
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-xs mt-1">
                {errors.price.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

/** Strip empty/undefined fields before sending to the API. */
function sanitizePayload(data: FormData): CreateServiceInput {
  const out: CreateServiceInput = { name: data.name.trim() };
  if (data.description) out.description = data.description.trim();
  if (data.type) out.type = data.type;
  if (data.price && data.price.trim() !== "") out.price = data.price.trim();
  return out;
}
