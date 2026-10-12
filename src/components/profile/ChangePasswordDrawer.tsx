import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { changePassword } from "@/api/auth";
import { getErrorMessage } from "@/api/client";
import { getStoredUser, saveAuth } from "@/store/authStore";
import Drawer from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";

// Mismas reglas que el backend (changePasswordSchema): 8–128 caracteres y
// distinta de la actual. La confirmación solo existe en el cliente.
const schema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(128, "Máximo 128 caracteres"),
    confirmPassword: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "Debe ser diferente a la actual",
    path: ["newPassword"],
  });

type FormData = z.infer<typeof schema>;

const FIELDS = [
  {
    name: "currentPassword",
    label: "Contraseña actual",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "Nueva contraseña",
    autoComplete: "new-password",
    hint: "Mínimo 8 caracteres.",
  },
  {
    name: "confirmPassword",
    label: "Repite la nueva contraseña",
    autoComplete: "new-password",
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Cajón lateral para cambiar la contraseña del usuario con sesión. */
export default function ChangePasswordDrawer({ open, onClose }: Props) {
  // Remontar el formulario en cada apertura: siempre empieza vacío.
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenCount((n) => n + 1);
  }

  return <PasswordForm key={openCount} open={open} onClose={onClose} />;
}

function PasswordForm({ open, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (d: FormData) =>
      changePassword(d.currentPassword, d.newPassword),
    onSuccess: ({ token }) => {
      // Las demás sesiones se cerraron: esta sigue con el token nuevo.
      const user = getStoredUser();
      if (token && user) saveAuth(token, user);
      toast.success("Contraseña actualizada", {
        description: "Se cerró la sesión en tus otros dispositivos.",
      });
      onClose();
    },
    onError: (err) => {
      // El error más común es la contraseña actual: se muestra en su campo.
      setError("currentPassword", {
        message: getErrorMessage(err, "No se pudo cambiar la contraseña"),
      });
    },
  });

  const formId = "change-password-form";
  const busy = mutation.isPending;

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="Cambiar contraseña"
      description="Por seguridad, se cerrará la sesión en tus otros dispositivos."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            <ShieldCheck size={18} aria-hidden="true" /> Guardar contraseña
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-xl bg-primary-soft p-4 mb-5">
        <span
          className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center"
          aria-hidden="true"
        >
          <KeyRound size={20} />
        </span>
        <p className="text-sm text-ink-2">
          Usa una contraseña que no uses en otros sitios. Combina letras,
          números y símbolos.
        </p>
      </div>

      <form
        id={formId}
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
      >
        {FIELDS.map((f) => (
          <FormField
            key={f.name}
            htmlFor={`pwd-${f.name}`}
            label={f.label}
            required
            error={errors[f.name]?.message}
            hint={"hint" in f ? f.hint : undefined}
          >
            <div className="relative">
              <input
                id={`pwd-${f.name}`}
                type={visible ? "text" : "password"}
                autoComplete={f.autoComplete}
                className="field pr-12"
                aria-invalid={!!errors[f.name]}
                autoFocus={f.name === "currentPassword"}
                disabled={busy}
                {...register(f.name)}
              />
              {f.name === "currentPassword" && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={
                    visible ? "Ocultar contraseñas" : "Mostrar contraseñas"
                  }
                  aria-pressed={visible}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </FormField>
        ))}
      </form>
    </Drawer>
  );
}
