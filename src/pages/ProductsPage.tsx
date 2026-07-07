import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
} from "@/api/products";
import { getCategories } from "@/api/categories";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

// ── Schema Zod (sin photo — llega como archivo) ───────────────

const schema = z.object({
  id_category: z.string().min(1, "Selecciona una categoría"),
  name: z.string().min(1, "Nombre requerido").max(30),
  description: z.string().max(250).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato inválido (ej. 50000 o 50000.00)"),
  stock: z.number().int().min(0, "Stock no puede ser negativo"),
  active: z.boolean(),
});

type ProductFormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type))
    return "Solo se permiten imágenes JPEG o PNG";
  if (file.size > MAX_BYTES) return "La imagen no puede superar 5 MB";
  return null;
}

function formatPrice(val: string) {
  const n = parseFloat(val);
  return isNaN(n) ? val : `$ ${n.toLocaleString("es-CO")}`;
}

// ── Componente ────────────────────────────────────────────────

type ImageZoneProps = {
  displayUrl: string | null;
  isEditing: boolean;
  fileError: string | null;
  previewUrl: string | null;
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetFile: () => void;
};

function ImageZone({
  displayUrl,
  isEditing,
  fileError,
  previewUrl,
  selectedFile,
  fileInputRef,
  onFileChange,
  onResetFile,
}: ImageZoneProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Imagen del producto
        {!isEditing && <span className="text-red-500"> *</span>}
      </label>

      {displayUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-44">
          <img
            src={displayUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
            }}
          />
          <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <ImagePlus size={22} className="text-white" />
            <span className="text-white text-xs font-medium">
              Cambiar imagen
            </span>
            <span className="text-white/60 text-[11px]">
              JPEG o PNG · máx. 5 MB
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={onFileChange}
            />
          </label>
          {previewUrl && (
            <button
              type="button"
              onClick={onResetFile}
              title="Quitar imagen seleccionada"
              className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            fileError
              ? "border-red-300 bg-red-50 hover:border-red-400"
              : "border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40"
          }`}
        >
          <ImagePlus
            size={28}
            className={fileError ? "text-red-300" : "text-slate-300"}
          />
          <p className="mt-2 text-sm font-medium text-slate-400">
            Haz clic para subir imagen
          </p>
          <p className="text-xs text-slate-300 mt-0.5">
            JPEG o PNG · máx. 5 MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={onFileChange}
          />
        </label>
      )}

      {fileError && (
        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
          {fileError}
        </p>
      )}
      {previewUrl && selectedFile && (
        <p className="text-slate-400 text-xs mt-1.5 truncate">
          {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
        </p>
      )}
    </div>
  );
}

function ProductThumbnail({ photo, name }: { photo: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-50 flex items-center justify-center">
      {photo && !imgError ? (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <Package size={16} className="text-slate-300" />
      )}
    </div>
  );
}

export default function ProductsPage() {
  const qc = useQueryClient();

  // tabla
  const [filterCat, setFilterCat] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  // imagen
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────

  const {
    data: products = [],
    isLoading,
    isError,
    error: productsError,
  } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const activeCategories = categories.filter((c) => c.active);

  const displayedProducts = filterCat
    ? products.filter((p) => p.id_category === filterCat)
    : products;

  // ── Mutations ─────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (fd: FormData) => createProduct(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Producto creado exitosamente");
    },
    onError: (err: unknown) =>
      toast.error(
        getErrorMessage(err, "Error al crear el producto"),
      ),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) =>
      updateProduct(id, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      closeModal();
      toast.success("Producto actualizado");
    },
    onError: (err: unknown) =>
      toast.error(
        getErrorMessage(err, "Error al actualizar"),
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Producto eliminado");
    },
    onError: (err: unknown) =>
      toast.error(
        getErrorMessage(err, "Error al eliminar"),
      ),
  });

  // ── Form ──────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({ resolver: zodResolver(schema) });

  const activeField = useWatch({ control, name: "active", defaultValue: true });

  // ── Imagen ────────────────────────────────────────────────────

  const resetFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileError(null);
  };

  // ── Modal open/close ──────────────────────────────────────────

  const isPending = createMut.isPending || updateMut.isPending;

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    resetFile();
    reset();
  };

  const openCreate = () => {
    setEditTarget(null);
    resetFile();
    reset({
      id_category: "",
      name: "",
      description: "",
      price: "",
      stock: 0,
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    resetFile();
    reset({
      id_category: p.id_category,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      stock: p.stock,
      active: p.active,
    });
    setModalOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────

  const onSubmit = (data: ProductFormValues) => {
    // Al crear, la imagen es obligatoria
    if (!editTarget && !selectedFile) {
      setFileError("La imagen del producto es requerida");
      return;
    }

    const fd = new FormData();
    fd.append("id_category", data.id_category);
    fd.append("name", data.name);
    fd.append("price", data.price);
    fd.append("stock", String(data.stock));
    fd.append("active", String(data.active));
    if (data.description) fd.append("description", data.description);
    if (selectedFile) fd.append("photo", selectedFile);

    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, fd });
    } else {
      createMut.mutate(fd);
    }
  };

  // ── Helpers de tabla ──────────────────────────────────────────

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  const stockColor = (n: number) =>
    n === 0 ? "text-red-500" : n < 5 ? "text-amber-500" : "text-slate-700";

  // ── Zona de imagen ───────────────────────────────────────────

  const currentPhoto = editTarget?.photo ?? null;
  const displayUrl = previewUrl ?? currentPhoto;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Catálogo de productos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {displayedProducts.length} de {products.length} productos
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo producto
        </Button>
      </div>

      {/* Filtro por categoría */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterCat("")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterCat === ""
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(filterCat === c.id ? "" : c.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterCat === c.id
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            Cargando productos...
          </div>
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="text-red-500 text-sm font-medium">
              Error al cargar los productos
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {(
                productsError as {
                  response?: { data?: { message?: string } };
                  message?: string;
                }
              )?.response?.data?.message ??
                (productsError as { message?: string })?.message ??
                "Verifica la conexión con el servidor"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3 w-[40%]">
                  Producto
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Categoría
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Precio
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Stock
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Imagen + nombre */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail photo={p.photo} name={p.name} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-xs text-slate-400 truncate max-w-40">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3 text-sm text-slate-500">
                    {catName(p.id_category)}
                  </td>

                  <td className="px-5 py-3 text-sm font-medium text-slate-700">
                    {formatPrice(p.price)}
                  </td>

                  <td className="px-5 py-3">
                    <span
                      className={`text-sm font-semibold ${stockColor(p.stock)}`}
                    >
                      {p.stock}
                      {p.stock === 0 && (
                        <span className="ml-1 text-xs font-normal">
                          (agotado)
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        p.active
                          ? { backgroundColor: "#D1FAE5", color: "#065F46" }
                          : { backgroundColor: "#FEE2E2", color: "#991B1B" }
                      }
                    >
                      {p.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(p)}>
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={
                          deleteMut.isPending && deleteMut.variables === p.id
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`,
                            )
                          ) {
                            deleteMut.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {displayedProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400 text-sm"
                  >
                    {filterCat
                      ? "No hay productos en esta categoría."
                      : "No hay productos registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!isPending) closeModal();
        }}
        title={editTarget ? `Editar · ${editTarget.name}` : "Nuevo producto"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear producto"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Zona de imagen */}
          <ImageZone
            displayUrl={displayUrl}
            isEditing={!!editTarget}
            fileError={fileError}
            previewUrl={previewUrl}
            selectedFile={selectedFile}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onResetFile={resetFile}
          />

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white ${
                errors.id_category
                  ? "border-red-400 bg-red-50"
                  : "border-slate-200"
              }`}
              {...register("id_category")}
            >
              <option value="">Seleccionar categoría</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.id_category && (
              <p className="text-red-500 text-xs mt-1">
                {errors.id_category.message}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.name ? "border-red-400 bg-red-50" : "border-slate-200"
              }`}
              placeholder="Ej: Camiseta deportiva"
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
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="Descripción opcional del producto"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Precio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  $
                </span>
                <input
                  className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                    errors.price
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200"
                  }`}
                  placeholder="50000"
                  {...register("price")}
                />
              </div>
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.price.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.stock ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("stock", { valueAsNumber: true })}
              />
              {errors.stock && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.stock.message}
                </p>
              )}
            </div>
          </div>

          {/* Toggle Activo (solo en edición) */}
          {editTarget && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Producto activo
                </p>
                <p className="text-xs text-slate-400">
                  Visible y disponible para compra en la app
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setValue("active", !activeField, { shouldValidate: true })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  activeField ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    activeField ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
