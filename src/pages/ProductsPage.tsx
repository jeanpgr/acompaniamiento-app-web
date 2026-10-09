import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getProductsPage,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from "@/api/products";
import { getCategories } from "@/api/categories";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import CursorPagination from "@/components/ui/CursorPagination";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import ProductsList from "@/components/products/ProductsList";
import ProductFormModal from "@/components/products/ProductFormModal";
import {
  toFormData,
  type ProductFormValues,
} from "@/components/products/productForm";


export default function ProductsPage() {
  const confirm = useConfirm();
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useViewMode();

  // Modal: `formKey` cambia en cada apertura para que el formulario empiece limpio.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Búsqueda y categoría se filtran en el servidor (paginación por cursor).
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["products", { id_category: filterCat, search: debouncedSearch }],
    (cursor) =>
      getProductsPage(cursor, {
        id_category: filterCat || undefined,
        search: debouncedSearch,
      }),
  );
  const { items: products, isLoading, isError, error } = pager;
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──────────
  const createMut = useMutation({
    mutationFn: createProduct,
    meta: {
      invalidates: "products",
      successMessage: "Producto creado exitosamente",
      errorMessage: "Error al crear el producto",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) =>
      updateProduct(id, fd),
    meta: {
      invalidates: "products",
      successMessage: "Producto actualizado",
      errorMessage: "Error al actualizar",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    meta: {
      invalidates: "products",
      successMessage: "Producto eliminado",
      errorMessage: "Error al eliminar",
    },
  });

  const openForm = (product: Product | null) => {
    setEditTarget(product);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const submitForm = (data: ProductFormValues, photo: File | null) => {
    const fd = toFormData(data, photo);
    if (editTarget) updateMut.mutate({ id: editTarget.id, fd });
    else createMut.mutate(fd);
  };

  const confirmDelete = async (p: Product) => {
    if (await confirm({ title: `¿Eliminar "${p.name}"?` }))
      deleteMut.mutate(p.id);
  };

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : filterCat
      ? "No hay productos en esta categoría."
      : "No hay productos registrados.";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Catálogo de productos
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            {pager.total} productos{filterCat ? " en esta categoría" : ""}
          </p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus size={16} /> Nuevo producto
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, descripción o categoría"
          label="Buscar productos"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterCat("")}
            aria-pressed={filterCat === ""}
            className="chip"
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)}
              aria-pressed={filterCat === c.id}
              className="chip"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando productos…" />
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="text-danger-fg text-sm font-medium">
              Error al cargar los productos
            </p>
            <p className="text-ink-3 text-xs mt-1">
              {getErrorMessage(
                error,
                error?.message || "Verifica la conexión con el servidor",
              )}
            </p>
          </div>
        ) : (
          <ProductsList
            products={products}
            view={view}
            emptyText={emptyText}
            categoryName={categoryName}
            renderActions={(p) => (
              <>
                <Button
                  size="icon"
                  aria-label={`Editar ${p.name}`}
                  title="Editar"
                  variant="secondary"
                  onClick={() => openForm(p)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  aria-label={`Eliminar ${p.name}`}
                  title="Eliminar"
                  variant="danger-soft"
                  loading={deleteMut.isPending && deleteMut.variables === p.id}
                  onClick={() => confirmDelete(p)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              </>
            )}
          />
        )}
        {!isLoading && <CursorPagination pager={pager} />}
      </div>

      <ProductFormModal
        key={formKey}
        open={modalOpen}
        product={editTarget}
        categories={categories}
        pending={createMut.isPending || updateMut.isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={submitForm}
      />
    </div>
  );
}
