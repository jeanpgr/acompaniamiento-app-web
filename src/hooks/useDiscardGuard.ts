import { useConfirm } from "@/components/ui/ConfirmDialog";

/**
 * Cierre protegido de un formulario: si hay cambios sin guardar, pregunta
 * antes de descartarlos. Úsalo en la X, Escape, el clic fuera y "Cancelar".
 *   const requestClose = useDiscardGuard(isDirty, onClose);
 */
export function useDiscardGuard(dirty: boolean, close: () => void) {
  const confirm = useConfirm();
  return async () => {
    if (
      dirty &&
      !(await confirm({
        title: "¿Descartar los cambios?",
        message: "Lo que escribiste en este formulario no se guardará.",
        confirmLabel: "Descartar cambios",
        tone: "danger",
      }))
    )
      return;
    close();
  };
}
