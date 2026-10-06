import { useId } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import type { DetailTourism } from "@/api/details-tourism";
import type { Service } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/ui/FormField";
import MapPickButton from "@/components/ui/MapPickButton";
import {
  formValues,
  tourismSchema,
  TOURISM_LIMITS,
  type TourismFormValues,
} from "./tourismForm";

interface Props {
  open: boolean;
  /** Excursión a editar; null para crear una nueva. */
  item: DetailTourism | null;
  /** Servicio fijado por la URL (?service=): oculta el selector. */
  serviceId: string | null;
  services: Service[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: TourismFormValues) => void;
}

const PRICE_FIELDS = [
  { field: "price_adult", label: "Adulto" },
  { field: "price_child", label: "Niño" },
  { field: "price_senior", label: "Tercera edad" },
] as const;

// Campo vacío → sin tarifa (undefined), no 0.
const optionalNumber = (v: unknown) =>
  v === "" || v === null || Number.isNaN(Number(v)) ? undefined : Number(v);

/**
 * Modal de alta/edición de excursión. El padre le cambia la `key` en cada
 * apertura para que el formulario empiece limpio.
 */
export default function TourismFormModal({
  open,
  item,
  serviceId,
  services,
  pending,
  onClose,
  onSubmit,
}: Props) {
  const formId = useId();
  const isEdit = item !== null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TourismFormValues>({
    defaultValues: formValues(item, serviceId),
    resolver: zodResolver(tourismSchema(item)),
  });
  // Paradas del itinerario como lista dinámica del propio formulario.
  const { fields, append, remove } = useFieldArray({
    control,
    name: "itinerary",
  });

  const tourismServices = services.filter(
    (s) => s.type === "TURISMO" && s.active,
  );
  const [meetingAddress, meetingLat, meetingLng, name, description] = useWatch({
    control,
    name: [
      "meeting_point_address",
      "meeting_point_lat",
      "meeting_point_lng",
      "name",
      "description",
    ],
  });
  // Escribir la dirección a mano descarta el punto del mapa (ya no coincide).
  const meetingField = register("meeting_point_address", {
    onChange: () => {
      setValue("meeting_point_lat", null);
      setValue("meeting_point_lng", null);
    },
  });

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={isEdit ? "Editar excursión" : "Nueva excursión"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Guardar cambios" : "Crear excursión"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        {!serviceId && (
          <FormField
            htmlFor="tourismdetail-id_service"
            label="Servicio"
            required
            error={errors.id_service?.message}
          >
            <select
              id="tourismdetail-id_service"
              className="field"
              aria-invalid={!!errors.id_service}
              {...register("id_service")}
            >
              <option value="">Seleccionar servicio</option>
              {tourismServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField
          htmlFor="tourismdetail-name"
          label="Nombre de la excursión"
          required
          error={errors.name?.message}
          hint={`${name?.length ?? 0}/${TOURISM_LIMITS.name} caracteres`}
        >
          <input
            id="tourismdetail-name"
            className="field"
            aria-invalid={!!errors.name}
            placeholder="Excursión a Baños"
            maxLength={TOURISM_LIMITS.name}
            {...register("name")}
          />
        </FormField>

        <FormField
          htmlFor="tourismdetail-description"
          label="Descripción"
          required
          error={errors.description?.message}
          hint={`${description?.length ?? 0}/${TOURISM_LIMITS.description} caracteres`}
        >
          <textarea
            id="tourismdetail-description"
            rows={3}
            className="field resize-none"
            aria-invalid={!!errors.description}
            placeholder="Descripción de la excursión"
            maxLength={TOURISM_LIMITS.description}
            {...register("description")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            htmlFor="tourismdetail-date_output"
            label="Fecha salida"
            required
            error={errors.date_output?.message}
          >
            <input
              id="tourismdetail-date_output"
              type="datetime-local"
              className="field"
              aria-invalid={!!errors.date_output}
              {...register("date_output")}
            />
          </FormField>
          <FormField
            htmlFor="tourismdetail-date_arrival"
            label="Fecha llegada"
            required
            error={errors.date_arrival?.message}
          >
            <input
              id="tourismdetail-date_arrival"
              type="datetime-local"
              className="field"
              aria-invalid={!!errors.date_arrival}
              {...register("date_arrival")}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            htmlFor="tourismdetail-quotas"
            label="Cupos totales"
            required
            error={errors.quotas?.message}
          >
            <input
              id="tourismdetail-quotas"
              type="number"
              min={1}
              max={1000}
              className="field"
              aria-invalid={!!errors.quotas}
              {...register("quotas", { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <FormField
          htmlFor="tourismdetail-meeting_point_address"
          label="Punto de encuentro"
          hint={
            typeof meetingLat === "number"
              ? "Punto exacto elegido en el mapa: la app lo mostrará ahí."
              : "Elige el punto en el mapa para que la app lo ubique con precisión."
          }
        >
          <div className="flex gap-2">
            <input
              id="tourismdetail-meeting_point_address"
              className="field"
              placeholder="Terminal de transportes"
              maxLength={255}
              {...meetingField}
            />
            <MapPickButton
              title="Punto de encuentro"
              address={meetingAddress ?? ""}
              lat={meetingLat}
              lng={meetingLng}
              onPick={({ address, lat, lng }) => {
                setValue("meeting_point_address", address, {
                  shouldDirty: true,
                });
                setValue("meeting_point_lat", lat);
                setValue("meeting_point_lng", lng);
              }}
            />
          </div>
        </FormField>

        {/* Tarifas por categoría */}
        <div>
          <p
            id="tourism-tarifas"
            className="block text-sm font-medium text-ink mb-2"
          >
            Tarifas por persona
          </p>
          <div
            role="group"
            aria-labelledby="tourism-tarifas"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {PRICE_FIELDS.map(({ field, label }) => (
              <div key={field}>
                <label
                  htmlFor={`tourism-${field}`}
                  className="block text-xs text-ink-2 mb-1"
                >
                  {label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
                    $
                  </span>
                  <input
                    id={`tourism-${field}`}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className="field pl-6 pr-3"
                    aria-invalid={!!errors[field]}
                    {...register(field, { setValueAs: optionalNumber })}
                  />
                </div>
                {errors[field] && (
                  <p className="text-danger-fg text-xs mt-1">
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-3 mt-1.5">
            Deja vacía una categoría si no aplica para esta excursión
          </p>
        </div>

        {/* Itinerario: hora + lugar de cada parada, en el orden del recorrido */}
        <fieldset>
          <div className="flex items-center justify-between mb-2">
            <legend className="block text-sm font-medium text-ink">
              Itinerario
            </legend>
            <button
              type="button"
              onClick={() => append({ hour: "", place: "" })}
              className="flex items-center gap-1 text-xs text-info-fg hover:text-info-fg font-medium"
            >
              <Plus size={12} /> Agregar parada
            </button>
          </div>
          {fields.length === 0 ? (
            <p className="text-xs text-ink-3 italic">
              Sin paradas. Haz clic en "Agregar parada" para añadir.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 text-xs text-ink-3" aria-hidden="true">
                <span className="w-28">Hora</span>
                <span className="flex-1">Lugar o actividad</span>
              </div>
              {fields.map((field, i) => {
                const placeError = errors.itinerary?.[i]?.place?.message;
                return (
                  <div key={field.id}>
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        aria-label={`Hora de la parada ${i + 1}`}
                        className="field w-28 shrink-0"
                        {...register(`itinerary.${i}.hour`)}
                      />
                      <input
                        aria-label={`Lugar o actividad de la parada ${i + 1}`}
                        aria-invalid={!!placeError}
                        placeholder="Mirador, almuerzo, hotel…"
                        maxLength={TOURISM_LIMITS.place}
                        className="field flex-1"
                        {...register(`itinerary.${i}.place`)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={`Quitar parada ${i + 1}`}
                        className="text-ink-3 hover:text-danger-fg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {placeError && (
                      <p className="text-danger-fg text-xs mt-1 ml-30">
                        {placeError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
