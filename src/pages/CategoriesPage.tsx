import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getCategoriesPage,
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
  name: z.string().min(1, "Nombre requerido").max(30),
  description: z.string().max(250).optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["categories", { search: debouncedSearch }],
    (cursor) => getCategoriesPage(cursor, { search: debouncedSearch }),
  );
  const { items: categories, isLoading } = pager;

  const createMut = useMutation({
    mutationFn: (data: CreateCategoryInput) => createCategory(data),
    meta: {
      invalidates: "categories",
      successMessage: "Categoría creada",
      errorMessage: "Error al crear",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      updateCategory(id, data),
    meta: {
      invalidates: "categories",
      successMessage: "Categoría actualizada",
      errorMessage: "Error al actualizar",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    meta: {
      invalidates: "categories",
      successMessage: "Categoría eliminada",
      errorMessage: "Error al eliminar",
    },
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
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay categorías registradas";

  const renderActions = (c: Category) => (
    <>
      <Button
        size="icon"
        aria-label={`Editar ${c.name}`}
        title="Editar"
        variant="secondary"
        onClick={() => openEdit(c)}
      >
        <Pencil size={16} aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        aria-label={`Eliminar ${c.name}`}
        title="Eliminar"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === c.id}
        onClick={async () => {
          if (await confirm({ title: `¿Eliminar "${c.name}"?` }))
            deleteMut.mutate(c.id);
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
            Categorías de productos
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            {pager.counts?.active ?? 0} activas · {pager.counts?.inactive ?? 0}{" "}
            inactivas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nueva categoría
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o descripción"
          label="Buscar categorías"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando categorías…" />
        ) : view === "grid" ? (
          <CardGrid empty={categories.length === 0 && emptyText}>
            {categories.map((c) => (
              <GridCard key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold text-ink text-base">{c.name}</h2>
                  <Badge variant={c.active ? "success" : "danger"}>
                    {c.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <p className="text-sm text-ink-3 line-clamp-3">
                  {c.description ?? "Sin descripción"}
                </p>
                <CardFields>
                  <CardField label="Creación">
                    {new Date(c.created_at).toLocaleDateString("es-CO")}
                  </CardField>
                </CardFields>
                <CardActions>{renderActions(c)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Nombre
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Descripción
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Estado
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
              {categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line/70 transition-colors hover:bg-primary-soft/50"
                >
                  <td className="px-4 py-3.5 font-semibold text-ink text-sm">
                    {c.name}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-3 max-w-50 truncate">
                    {c.description ?? (
                      <span className="text-ink-3 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={c.active ? "success" : "danger"}>
                      {c.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-3">
                    {new Date(c.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">{renderActions(c)}</div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
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
              className="block text-sm font-semibold text-ink mb-1.5"
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
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="categories-description"
              className="block text-sm font-semibold text-ink mb-1.5"
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
                <p className="text-sm font-semibold text-ink">Estado activo</p>
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
