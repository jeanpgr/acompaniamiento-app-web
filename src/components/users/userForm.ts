import { z } from "zod";
import type { User } from "@/api/users";

const baseSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(50),
  lastname: z.string().min(2, "Mínimo 2 caracteres").max(50),
  email: z.string().email("Email inválido").max(100),
  id_role: z.string().uuid().optional().or(z.literal("")),
  // Al editar pueden quedar vacíos; si se escriben, solo dígitos.
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Entre 6 y 10 dígitos")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,10}$/, "Entre 7 y 10 dígitos")
    .optional()
    .or(z.literal("")),
  address: z.string().max(250).optional().or(z.literal("")),
});

// Al crear, la BD exige cédula, teléfono y dirección (columnas NOT NULL).
export const createSchema = baseSchema.extend({
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Entre 6 y 10 dígitos"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,10}$/, "Entre 7 y 10 dígitos"),
  address: z.string().trim().min(5, "La dirección es obligatoria").max(250),
});

export const editSchema = baseSchema;

export type CreateFormData = z.infer<typeof createSchema>;
export type EditFormData = z.infer<typeof editSchema>;

/** Valores iniciales del formulario: vacío al crear, los del usuario al editar. */
export function formValues(user: User | null): CreateFormData {
  return {
    name: user?.name ?? "",
    lastname: user?.lastname ?? "",
    email: user?.email ?? "",
    password: "",
    id_role: user?.id_role ?? "",
    cedula: user?.cedula ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
  };
}

/** Quita los campos vacíos y recorta espacios antes de enviar. */
export function sanitize(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") {
      out[k] = typeof v === "string" ? v.trim() : v;
    }
  }
  return out;
}

// Mismos límites que el backend (upload.middleware): JPG/PNG, máx 5 MB.
const PHOTO_TYPES = ["image/jpeg", "image/png"];
export const MAX_PHOTO_MB = 5;

export function validatePhoto(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type))
    return "Solo se permiten imágenes JPG o PNG.";
  if (file.size > MAX_PHOTO_MB * 1024 * 1024)
    return `La imagen supera los ${MAX_PHOTO_MB} MB.`;
  return null;
}

export function initialsOf(name: string, lastname: string | null) {
  return `${name[0] ?? ""}${lastname?.[0] ?? ""}`.toUpperCase();
}
