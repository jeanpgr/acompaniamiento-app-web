import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Eye, EyeOff, AlertCircle } from "lucide-react";
import { signIn } from "@/api/auth";
import { saveAuth } from "@/store/authStore";
import Button from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const res = await signIn(data.email, data.password);
      saveAuth(res.token, res.user);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Credenciales incorrectas. Intenta de nuevo.";
      setApiError(msg);
    }
  };

  return (
    <div className="min-h-screen flex bg-app-bg">
      {/* Panel de marca */}
      <div className="hidden lg:flex flex-col w-80 xl:w-96 p-10 shrink-0 bg-sidebar">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-mark"
            aria-hidden="true"
          >
            <Heart size={20} className="text-white" fill="white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg leading-tight">
              Acompáñame
            </p>
            <p className="text-white/65 text-xs">Panel Administrativo</p>
          </div>
        </div>

        <div className="mt-auto mb-auto">
          <h2 className="text-white text-3xl font-bold leading-tight mb-4 text-balance">
            Gestiona tu plataforma
          </h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-[32ch]">
            Administra usuarios, servicios, vehículos y agendas desde un solo
            lugar.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-surface rounded-2xl shadow-[0_8px_24px_-8px_rgb(23_38_58/0.12)] border border-line w-full max-w-sm p-8">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand-mark"
              aria-hidden="true"
            >
              <Heart size={16} className="text-white" fill="white" />
            </div>
            <span className="font-semibold text-ink">Acompáñame</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Iniciar sesión</h1>
          <p className="text-sm text-ink-3 mb-7">
            Ingresa tus credenciales para acceder al panel
          </p>

          {apiError && (
            <div
              role="alert"
              className="flex items-center gap-2 bg-danger-bg text-danger-fg text-sm px-4 py-3 rounded-lg mb-5"
            >
              <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
              <span>{apiError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="field h-11"
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? "login-email-error" : undefined
                }
                {...register("email")}
              />
              {errors.email && (
                <p
                  id="login-email-error"
                  className="text-danger-fg text-xs mt-1"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="field h-11 pr-11"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "login-password-error" : undefined
                  }
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-2"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p
                  id="login-password-error"
                  className="text-danger-fg text-xs mt-1"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full h-11"
            >
              {isSubmitting ? "Ingresando…" : "Ingresar al panel"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
