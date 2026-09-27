import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/api/categories";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Switch from "@/components/ui/Switch";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";
import Badge from "@/components/ui/Badge";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido").max(30),
  description: z.string().max(250).optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateCategoryInput) => createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
      toast.success("Categoría creada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al crear",
      ),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setModalOpen(false);
      toast.success("Categoría actualizada");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoría eliminada");
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
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const activeField = useWatch({ control, name: "active", defaultValue: true });

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: "", description: "", active: true });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditTarget(c);
    reset({ name: c.name, description: c.description ?? "", active: c.active });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateCategoryInput = {
      name: data.name,
      active: data.active,
      ...(data.description ? { description: data.description } : {}),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const activeList = categories.filter((c) => c.active);
  const inactive = categories.filter((c) => !c.active);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Categorías de productos
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {activeList.length} activas · {inactive.length} inactivas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nueva categoría
        </Button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando categorías…" />
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Nombre
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Descripción
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Estado
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
              {categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line/70 hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5 font-medium text-ink text-sm">
                    {c.name}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3 max-w-50 truncate">
                    {c.description ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={c.active ? "success" : "danger"}>
                      {c.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {new Date(c.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-soft"
                        loading={
                          deleteMut.isPending && deleteMut.variables === c.id
                        }
                        onClick={async () => {
                          if (
                            await confirm({ title: `¿Eliminar "${c.name}"?` })
                          )
                            deleteMut.mutate(c.id);
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    No hay categorías registradas
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
        title={editTarget ? "Editar categoría" : "Nueva categoría"}
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
              {editTarget ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label
              htmlFor="categories-name"
              className="block text-sm font-medium text-ink mb-1"
            >
              Nombre <span className="text-danger-fg">*</span>
            </label>
            <input
              id="categories-name"
              className="field"
              aria-invalid={!!errors.name}
              placeholder="Ropa deportiva"
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
              htmlFor="categories-description"
              className="block text-sm font-medium text-ink mb-1"
            >
              Descripción
            </label>
            <textarea
              id="categories-description"
              rows={3}
              className="field resize-none"
              placeholder="Descripción opcional"
              {...register("description")}
            />
          </div>

          {editTarget && (
            <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Estado activo</p>
                <p className="text-xs text-ink-3">
                  La categoría aparece disponible en la app
                </p>
              </div>
              <Switch
                checked={activeField}
                label="Estado activo"
                onChange={(v) =>
                  setValue("active", v, { shouldValidate: true })
                }
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
