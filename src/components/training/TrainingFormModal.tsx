import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DetailTraining } from "@/api/details-training";
import type { Service } from "@/api/services";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/ui/FormField";
import {
  formatDuration,
  formValues,
  trainingSchema,
  TRAINING_LIMITS,
  type TrainingFormValues,
} from "./trainingForm";

interface Props {
  open: boolean;
  /** Capacitación a editar; null para crear una nueva. */
  item: DetailTraining | null;
  /** Servicio fijado por la URL (?service=): oculta el selector. */
  serviceId: string | null;
  services: Service[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: TrainingFormValues) => void;
}

// Campo vacío → gratuito (undefined), no 0.
const optionalNumber = (v: unknown) =>
  v === "" || v === null || Number.isNaN(Number(v)) ? undefined : Number(v);

/**
 * Modal de alta/edición de capacitación. El padre le cambia la `key` en cada
 * apertura para que el formulario empiece limpio.
 */
export default function TrainingFormModal({
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
  } = useForm<TrainingFormValues>({
    defaultValues: formValues(item, serviceId),
    resolver: zodResolver(trainingSchema(isEdit)),
  });

  const trainingServices = services.filter(
    (s) => s.type === "CAPACITACION" && s.active,
  );
  const [topic, description, duration] = useWatch({
    control,
    name: ["topic", "description", "duration"],
  });

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={isEdit ? "Editar capacitación" : "Nueva capacitación"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Guardar cambios" : "Crear capacitación"}
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
            htmlFor="trainingdetail-id_service"
            label="Servicio"
            required
            error={errors.id_service?.message}
          >
            <select
              id="trainingdetail-id_service"
              className="field"
              aria-invalid={!!errors.id_service}
              {...register("id_service")}
            >
              <option value="">Seleccionar servicio</option>
              {trainingServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField
          htmlFor="trainingdetail-topic"
          label="Tema"
          required
          error={errors.topic?.message}
          hint={`${topic?.length ?? 0}/${TRAINING_LIMITS.topic} caracteres`}
        >
          <input
            id="trainingdetail-topic"
            className="field"
            aria-invalid={!!errors.topic}
            placeholder="Manejo del celular"
            maxLength={TRAINING_LIMITS.topic}
            {...register("topic")}
          />
        </FormField>

        <FormField
          htmlFor="trainingdetail-description"
          label="Descripción"
          required
          error={errors.description?.message}
          hint={`${description?.length ?? 0}/${TRAINING_LIMITS.description} caracteres`}
        >
          <textarea
            id="trainingdetail-description"
            rows={3}
            className="field resize-none"
            aria-invalid={!!errors.description}
            placeholder="Qué aprenderán los participantes"
            maxLength={TRAINING_LIMITS.description}
            {...register("description")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            htmlFor="trainingdetail-date_time"
            label="Fecha y hora"
            required
            error={errors.date_time?.message}
          >
            <input
              id="trainingdetail-date_time"
              type="datetime-local"
              className="field"
              aria-invalid={!!errors.date_time}
              {...register("date_time")}
            />
          </FormField>
          <FormField
            htmlFor="trainingdetail-duration"
            label="Duración (min)"
            required
            error={errors.duration?.message}
            hint={
              Number.isInteger(duration) && duration > 0
                ? formatDuration(duration)
                : undefined
            }
          >
            <input
              id="trainingdetail-duration"
              type="number"
              min={1}
              max={TRAINING_LIMITS.duration}
              step={5}
              className="field"
              aria-invalid={!!errors.duration}
              {...register("duration", { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <FormField
          htmlFor="trainingdetail-price"
          label="Precio"
          error={errors.price?.message}
          hint="Deja vacío si el taller es gratuito"
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3">
              $
            </span>
            <input
              id="trainingdetail-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              className="field pl-6 pr-3"
              aria-invalid={!!errors.price}
              {...register("price", { setValueAs: optionalNumber })}
            />
          </div>
        </FormField>

        <FormField
          htmlFor="trainingdetail-link_meet"
          label="Enlace de la reunión"
          error={errors.link_meet?.message}
          hint="Meet, Zoom o Teams. La app lo muestra a los inscritos."
        >
          <input
            id="trainingdetail-link_meet"
            type="url"
            inputMode="url"
            className="field"
            aria-invalid={!!errors.link_meet}
            placeholder="https://meet.google.com/..."
            {...register("link_meet")}
          />
        </FormField>
      </form>
    </Modal>
  );
}
