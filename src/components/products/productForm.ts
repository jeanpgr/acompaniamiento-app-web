import { z } from "zod";
import type { Product } from "@/api/products";

// La foto no va en el schema: llega como archivo aparte.
export const productSchema = z.object({
  id_category: z.string().min(1, "Selecciona una categoría"),
  name: z.string().min(1, "Nombre requerido").max(30),
  description: z.string().max(250).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Formato inválido (ej. 50000 o 50000.00)"),
  stock: z.number().int().min(0, "Stock no puede ser negativo"),
  active: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

/** Valores iniciales: vacío al crear, los del producto al editar. */
export function formValues(p: Product | null): ProductFormValues {
  return {
    id_category: p?.id_category ?? "",
    name: p?.name ?? "",
    description: p?.description ?? "",
    price: p?.price ?? "",
    stock: p?.stock ?? 0,
    active: p?.active ?? true,
  };
}

/** Cuerpo multipart para crear/editar (el backend recibe la foto en `photo`). */
export function toFormData(data: ProductFormValues, photo: File | null) {
  const fd = new FormData();
  fd.append("id_category", data.id_category);
  fd.append("name", data.name);
  fd.append("price", data.price);
  fd.append("stock", String(data.stock));
  fd.append("active", String(data.active));
  if (data.description) fd.append("description", data.description);
  if (photo) fd.append("photo", photo);
  return fd;
}

// Mismos límites que el backend (upload.middleware): JPG/PNG, máx 5 MB.
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type))
    return "Solo se permiten imágenes JPEG o PNG";
  if (file.size > MAX_BYTES) return "La imagen no puede superar 5 MB";
  return null;
}

export function formatPrice(val: string) {
  const n = parseFloat(val);
  return isNaN(n) ? val : `$ ${n.toLocaleString("es-CO")}`;
}

export const stockColor = (n: number) =>
  n === 0 ? "text-danger-fg" : n < 5 ? "text-warning-fg" : "text-ink";
