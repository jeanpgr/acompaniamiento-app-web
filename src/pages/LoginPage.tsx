import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, Eye, EyeOff, AlertCircle } from "lucide-react";
import { signIn } from "@/api/auth";
import { saveAuth } from "@/store/authStore";
import Button from "@/components/ui/Button";
import { getErrorMessage } from "@/api/client";

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
    } catch (err) {
      setApiError(
        getErrorMessage(err, "Credenciales incorrectas. Intenta de nuevo."),
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-app-bg">
      {/* Panel de marca */}
      <div className="hidden lg:flex flex-col items-center justify-center text-center w-96 xl:w-[28rem] p-10 shrink-0 bg-sidebar">
        {/* Mismo recibimiento que la app móvil: logo dorado sobre navy */}
        <div
          className="w-30 h-30 rounded-full flex items-center justify-center bg-gold shadow-[0_8px_28px_-4px_rgb(252_201_118/0.5)] mb-8"
          aria-hidden="true"
        >
          <Heart size={56} className="text-sidebar" fill="currentColor" />
        </div>
        <h2 className="text-white text-[32px] font-bold leading-tight mb-1">
          Bienvenido
        </h2>
        <p className="text-gold text-2xl font-extrabold mb-6">
          Acompáñame · Panel
        </p>
        <p className="text-on-dark text-base leading-relaxed max-w-[30ch]">
          Administra usuarios, servicios, vehículos y agendas desde un solo
          lugar.
        </p>
      </div>

      {/* Formulario */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-surface rounded-2xl shadow-lg w-full max-w-md p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center bg-gold"
              aria-hidden="true"
            >
              <Heart size={22} className="text-sidebar" fill="currentColor" />
            </div>
            <span className="text-lg font-extrabold text-ink">Acompáñame</span>
          </div>

          <h1 className="text-[26px] font-bold text-ink mb-1">Iniciar sesión</h1>
          <p className="text-base text-ink-3 mb-7">
            Ingresa tus credenciales para acceder al panel
          </p>

          {apiError && (
            <div
              role="alert"
              className="flex items-center gap-2 bg-danger-bg text-danger-fg text-sm font-medium px-4 py-3 rounded-lg mb-5"
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
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="field h-13 text-base"
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? "login-email-error" : undefined
                }
                {...register("email")}
              />
              {errors.email && (
                <p
                  id="login-email-error"
                  className="text-danger-fg text-xs font-semibold mt-1"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="field h-13 text-base pr-12"
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
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-2"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p
                  id="login-password-error"
                  className="text-danger-fg text-xs font-semibold mt-1"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full h-13 text-base mt-2"
            >
              {isSubmitting ? "Ingresando…" : "Ingresar al panel"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
