import { z } from "zod";
import type {
  CreateDetailTrainingInput,
  DetailTraining,
} from "@/api/details-training";
import {
  fromLocalInput,
  isPastLocalInput,
  isValidLocalInput,
  toLocalInput,
} from "@/lib/datetime";

/** Largos máximos de las columnas (detail_srv_training). */
export const TRAINING_LIMITS = {
  topic: 100,
  description: 250,
  /** Duración en minutos (columna smallint; 12 h es más que suficiente). */
  duration: 720,
} as const;

const baseSchema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  topic: z
    .string()
    .trim()
    .min(1, "El tema es requerido")
    .max(TRAINING_LIMITS.topic, `Máximo ${TRAINING_LIMITS.topic} caracteres`),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es requerida")
    .max(
      TRAINING_LIMITS.description,
      `Máximo ${TRAINING_LIMITS.description} caracteres`,
    ),
  date_time: z.string().refine(isValidLocalInput, "Fecha y hora requeridas"),
  duration: z
    .number({ message: "Ingresa los minutos" })
    .int("Debe ser un número entero")
    .positive("Debe ser al menos 1 minuto")
    .max(
      TRAINING_LIMITS.duration,
      `Máximo ${TRAINING_LIMITS.duration} minutos`,
    ),
  link_meet: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), {
      message: "Pega el enlace completo (https://…)",
    }),
  price: z
    .number({ message: "Ingresa un número" })
    .nonnegative("Debe ser 0 o mayor")
    .optional(),
});

export type TrainingFormValues = z.infer<typeof baseSchema>;

/**
 * Esquema del formulario. Al crear, la fecha debe ser futura: la app móvil
 * oculta las capacitaciones que ya empezaron, así que una en el pasado nunca
 * se vería. Al editar se permite.
 */
export function trainingSchema(isEdit: boolean) {
  return baseSchema.superRefine((d, ctx) => {
    if (
      !isEdit &&
      isValidLocalInput(d.date_time) &&
      isPastLocalInput(d.date_time)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha debe ser en el futuro",
        path: ["date_time"],
      });
    }
  });
}

/** Valores iniciales: vacío al crear (con el servicio de la URL), o los del taller. */
export function formValues(
  item: DetailTraining | null,
  serviceId: string | null,
): TrainingFormValues {
  return {
    id_service: item?.id_service ?? serviceId ?? "",
    topic: item?.topic.trim() ?? "",
    description: item?.description ?? "",
    date_time: toLocalInput(item?.date_time),
    duration: item?.duration ?? 60,
    link_meet: item?.link_meet ?? "",
    price: item?.price != null ? Number(item.price) : undefined,
  };
}

/** Cuerpo para la API. Al editar, vaciar el enlace o el precio los borra. */
export function toPayload(
  data: TrainingFormValues,
  editing: DetailTraining | null,
): CreateDetailTrainingInput {
  return {
    id_service: data.id_service,
    topic: data.topic,
    description: data.description,
    date_time: fromLocalInput(data.date_time),
    duration: data.duration,
    ...(data.link_meet
      ? { link_meet: data.link_meet }
      : editing && { link_meet: null }),
    ...(data.price !== undefined
      ? { price: data.price.toFixed(2) }
      : editing && { price: null }),
  };
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** "90 min" → "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
