import { z } from "zod";
import type {
  CreateDetailTourismInput,
  DetailTourism,
} from "@/api/details-tourism";

const price = z
  .number({ message: "Ingresa un número" })
  .nonnegative("Debe ser 0 o mayor")
  .optional();

export const tourismSchema = z.object({
  id_service: z.string().min(1, "Selecciona un servicio"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  date_output: z.string().min(1, "Fecha de salida requerida"),
  date_arrival: z.string().min(1, "Fecha de llegada requerida"),
  quotas: z.number().int().positive("Debe ser un número positivo"),
  meeting_point_address: z.string().optional(),
  // Punto del mapa; se descarta si la dirección se edita a mano.
  meeting_point_lat: z.number().nullable(),
  meeting_point_lng: z.number().nullable(),
  price_adult: price,
  price_child: price,
  price_senior: price,
  // Paradas del recorrido (useFieldArray); las vacías se descartan al enviar.
  itinerary: z.array(z.object({ hour: z.string(), place: z.string() })),
});

export type TourismFormValues = z.infer<typeof tourismSchema>;

/** Valores iniciales: vacío al crear (con el servicio de la URL), o los de la excursión. */
export function formValues(
  item: DetailTourism | null,
  serviceId: string | null,
): TourismFormValues {
  return {
    id_service: item?.id_service ?? serviceId ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    // datetime-local espera "YYYY-MM-DDTHH:mm".
    date_output: item?.date_output?.slice(0, 16) ?? "",
    date_arrival: item?.date_arrival?.slice(0, 16) ?? "",
    quotas: item?.quotas ?? 1,
    meeting_point_address: item?.meeting_point_address ?? "",
    meeting_point_lat: item?.meeting_point_lat ?? null,
    meeting_point_lng: item?.meeting_point_lng ?? null,
    price_adult: item?.prices?.adult,
    price_child: item?.prices?.child,
    price_senior: item?.prices?.senior,
    itinerary: (item?.itinerary ?? []).map((s) => ({
      hour: s.hour ?? "",
      place: s.place ?? "",
    })),
  };
}

/** Cuerpo para la API. Al editar se conservan los cupos disponibles actuales. */
export function toPayload(
  data: TourismFormValues,
  editing: DetailTourism | null,
): CreateDetailTourismInput {
  const stops = data.itinerary.filter((s) => s.hour || s.place);
  const prices: Record<string, number> = {};
  if (data.price_adult !== undefined) prices.adult = data.price_adult;
  if (data.price_child !== undefined) prices.child = data.price_child;
  if (data.price_senior !== undefined) prices.senior = data.price_senior;
  return {
    id_service: data.id_service,
    name: data.name,
    description: data.description,
    date_output: new Date(data.date_output).toISOString(),
    date_arrival: new Date(data.date_arrival).toISOString(),
    quotas: data.quotas,
    quotas_available: editing ? editing.quotas_available : data.quotas,
    ...(data.meeting_point_address?.trim() && {
      meeting_point_address: data.meeting_point_address,
    }),
    // Siempre se envían: null borra un punto anterior si la dirección cambió.
    meeting_point_lat: data.meeting_point_address?.trim()
      ? data.meeting_point_lat
      : null,
    meeting_point_lng: data.meeting_point_address?.trim()
      ? data.meeting_point_lng
      : null,
    ...(stops.length > 0 && { itinerary: stops }),
    ...(Object.keys(prices).length > 0 && { prices }),
  };
}

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
