import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Product } from "@/api/products";
import type { Category } from "@/api/categories";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Switch from "@/components/ui/Switch";
import FormField from "@/components/ui/FormField";
import ImageZone from "./ImageZone";
import {
  formValues,
  productSchema,
  validateFile,
  type ProductFormValues,
} from "./productForm";
import { useDiscardGuard } from "@/hooks/useDiscardGuard";

interface Props {
  open: boolean;
  /** Producto a editar; null para crear uno nuevo. */
  product: Product | null;
  categories: Category[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormValues, photo: File | null) => void;
}

/**
 * Modal de alta/edición de producto. El padre le cambia la `key` en cada
 * apertura para que el formulario y la imagen empiecen limpios.
 */
export default function ProductFormModal({
  open,
  product,
  categories,
  pending,
  onClose,
  onSubmit,
}: Props) {
  const formId = useId();
  const isEdit = product !== null;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    defaultValues: formValues(product),
    resolver: zodResolver(productSchema),
  });
  // Cerrar con cambios sin guardar pide confirmación.
  const requestClose = useDiscardGuard(isDirty || !!file, onClose);
  const active = useWatch({ control, name: "active" });

  const pickFile = (picked: File) => {
    const err = validateFile(picked);
    setFileError(err);
    // Un archivo inválido no reemplaza al que ya estaba elegido.
    if (!err) setFile(picked);
  };

  const submit = (data: ProductFormValues) => {
    // Al crear, la imagen es obligatoria.
    if (!isEdit && !file) {
      setFileError("La imagen del producto es requerida");
      return;
    }
    onSubmit(data, file);
  };

  return (
    <Modal
      open={open}
      onClose={() => !pending && requestClose()}
      title={isEdit ? `Editar · ${product.name}` : "Nuevo producto"}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form id={formId} className="space-y-4" onSubmit={handleSubmit(submit)}>
        <ImageZone
          file={file}
          currentUrl={product?.photo ?? null}
          required={!isEdit}
          error={fileError}
          onPick={pickFile}
          onClear={() => {
            setFile(null);
            setFileError(null);
          }}
        />

        <FormField
          htmlFor="products-id_category"
          label="Categoría"
          required
          error={errors.id_category?.message}
        >
          <select
            id="products-id_category"
            className="field"
            aria-invalid={!!errors.id_category}
            {...register("id_category")}
          >
            <option value="">Seleccionar categoría</option>
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </FormField>

        <FormField
          htmlFor="products-name"
          label="Nombre"
          required
          error={errors.name?.message}
        >
          <input
            id="products-name"
            className="field"
            aria-invalid={!!errors.name}
            placeholder="Ej: Camiseta deportiva"
            {...register("name")}
          />
        </FormField>

        <FormField
          htmlFor="products-description"
          label="Descripción"
          error={errors.description?.message}
        >
          <textarea
            id="products-description"
            rows={2}
            className="field resize-none"
            placeholder="Descripción opcional del producto"
            {...register("description")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            htmlFor="products-price"
            label="Precio"
            required
            error={errors.price?.message}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-sm">
                $
              </span>
              <input
                id="products-price"
                className="field pl-7 pr-3"
                aria-invalid={!!errors.price}
                placeholder="50000"
                {...register("price")}
              />
            </div>
          </FormField>
          <FormField
            htmlFor="products-stock"
            label="Stock"
            required
            error={errors.stock?.message}
          >
            <input
              id="products-stock"
              type="number"
              min={0}
              className="field"
              aria-invalid={!!errors.stock}
              {...register("stock", { valueAsNumber: true })}
            />
          </FormField>
        </div>

        {/* Activo: solo al editar (un producto nuevo nace activo) */}
        {isEdit && (
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Producto activo</p>
              <p className="text-xs text-ink-3">
                Visible y disponible para compra en la app
              </p>
            </div>
            <Switch
              checked={active}
              label="Producto activo"
              onChange={(v) => setValue("active", v, { shouldValidate: true })}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
