import { useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import type { DetailTourism } from "@/api/details-tourism";
import type { Service } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/ui/FormField";
import {
  formValues,
  tourismSchema,
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
    formState: { errors },
  } = useForm<TourismFormValues>({
    defaultValues: formValues(item, serviceId),
    resolver: zodResolver(tourismSchema),
  });
  // Paradas del itinerario como lista dinámica del propio formulario.
  const { fields, append, remove } = useFieldArray({ control, name: "itinerary" });

  const tourismServices = services.filter((s) => s.type === "TURISMO" && s.active);

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
      <form id={formId} className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
        >
          <input
            id="tourismdetail-name"
            className="field"
            aria-invalid={!!errors.name}
            placeholder="Excursión Cartagena"
            {...register("name")}
          />
        </FormField>

        <FormField
          htmlFor="tourismdetail-description"
          label="Descripción"
          required
          error={errors.description?.message}
        >
          <textarea
            id="tourismdetail-description"
            rows={2}
            className="field resize-none"
            aria-invalid={!!errors.description}
            placeholder="Descripción de la excursión"
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
              className="field"
              aria-invalid={!!errors.quotas}
              {...register("quotas", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            htmlFor="tourismdetail-meeting_point_address"
            label="Punto de encuentro"
          >
            <input
              id="tourismdetail-meeting_point_address"
              className="field"
              placeholder="Terminal de transportes"
              {...register("meeting_point_address")}
            />
          </FormField>
        </div>

        {/* Tarifas por categoría */}
        <div>
          <p id="tourism-tarifas" className="block text-sm font-medium text-ink mb-2">
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

        {/* Itinerario */}
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
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <input
                    aria-label={`Hora de la parada ${i + 1}`}
                    placeholder="09:00"
                    className="border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none w-20"
                    {...register(`itinerary.${i}.hour`)}
                  />
                  <input
                    aria-label={`Lugar o actividad de la parada ${i + 1}`}
                    placeholder="Lugar o actividad"
                    className="border border-line rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1"
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
              ))}
            </div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
