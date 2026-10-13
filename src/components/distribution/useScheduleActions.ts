import { useMutation } from "@tanstack/react-query";
import type { Vehicle } from "@/api/vehicles";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  assignSchedule,
  confirmPaymentSchedule,
  markRefundComplete,
  type Unified,
} from "./schedules";

/**
 * Acciones del equipo sobre una cita (asignar vehículo / confirmar el pago y
 * marcar el reembolso), cada una con su confirmación. Las usa la página de
 * Servicios y estados; el panel de Distribución tiene las suyas con la
 * animación de la cola.
 */
export function useScheduleActions(vehicles: Vehicle[]) {
  const confirm = useConfirm();

  const assignMut = useMutation({
    mutationFn: ({ s, vehicleId }: { s: Unified; vehicleId: string }) =>
      assignSchedule(s, vehicleId),
    meta: {
      invalidates: "schedules",
      successMessage: "Listo",
      errorMessage: "No se pudo confirmar. Intenta de nuevo.",
    },
  });

  const payMut = useMutation({
    mutationFn: (s: Unified) => confirmPaymentSchedule(s),
    meta: {
      invalidates: "schedules",
      successMessage: "Pago confirmado",
      errorMessage: "No se pudo confirmar el pago. Intenta de nuevo.",
    },
  });

  const refundMut = useMutation({
    mutationFn: (s: Unified) => markRefundComplete[s.originalType](s.id),
    meta: {
      invalidates: "schedules",
      successMessage: "Reembolso registrado",
      errorMessage: "No se pudo registrar el reembolso",
    },
  });

  /** Pide confirmación y asigna (o solo confirma si la cita no usa vehículo). */
  const assign = async (s: Unified, vehicleId: string) => {
    if (s.needsVehicle && !vehicleId) return;
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const ok = await confirm({
      title: vehicle
        ? `¿Asignar ${vehicle.name} (${vehicle.license_plate})?`
        : "¿Confirmar este servicio?",
      message:
        s.originalType === "acompan"
          ? `${s.title} · ${s.personName}. El conductor de ese vehículo verá el servicio al iniciar sesión y será quien lo marque en ruta o completado.`
          : s.needsVehicle
            ? `${s.title} · ${s.personName}. El pago ya está confirmado; el vehículo queda asignado al servicio.`
            : `${s.title} · ${s.personName}. La cita quedará como pagada y el cliente lo verá en la app.`,
      confirmLabel: vehicle ? "Asignar vehículo" : "Confirmar",
      tone: "primary",
    });
    if (ok) assignMut.mutate({ s, vehicleId });
  };

  const confirmPayment = async (s: Unified) => {
    const ok = await confirm({
      title: "¿Confirmar el pago?",
      message:
        s.originalType === "acompan"
          ? `${s.title} · ${s.personName}. Se registra el pago; el estado del servicio lo sigue cambiando el conductor.`
          : `${s.title} · ${s.personName}. La cita quedará como pagada y el cliente lo verá en la app.`,
      confirmLabel: "Confirmar pago",
      tone: "primary",
    });
    if (ok) payMut.mutate(s);
  };

  const markRefunded = async (s: Unified) => {
    const ok = await confirm({
      title: "¿Ya se hizo la transferencia del reembolso?",
      message: [
        `${s.title} · ${s.personName}`,
        (s.refundBank || s.refundAccount) &&
          `${s.refundBank ?? ""} · ${s.refundAccountType ?? ""} ${s.refundAccount ?? ""}`,
        s.refundHolderCedula && `Cédula del titular: ${s.refundHolderCedula}`,
      ]
        .filter(Boolean)
        .join("\n"),
      confirmLabel: "Sí, reembolso realizado",
      tone: "primary",
    });
    if (ok) refundMut.mutate(s);
  };

  return {
    assign,
    confirmPayment,
    markRefunded,
    payingId: payMut.isPending ? payMut.variables?.id : undefined,
    assigningId: assignMut.isPending ? assignMut.variables?.s.id : undefined,
    refundingId: refundMut.isPending ? refundMut.variables?.id : undefined,
  };
}
