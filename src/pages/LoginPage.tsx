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
    <div className="min-h-screen flex" style={{ backgroundColor: "#EEF1F8" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 xl:w-96 p-10 shrink-0"
        style={{ backgroundColor: "#17263A" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#2A5298" }}
            >
              <Heart size={20} className="text-white" fill="white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg leading-tight">
                Acompáñame
              </p>
              <p className="text-white/40 text-xs">Panel Administrativo</p>
            </div>
          </div>

          <h2 className="text-white text-3xl font-bold leading-tight mb-4">
            Gestiona tu
            <br />
            plataforma
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Administra usuarios, servicios, vehículos y agendas desde un solo
            lugar.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { num: "87", label: "Servicios este mes" },
            { num: "4.6★", label: "Satisfacción promedio" },
            { num: "26", label: "Personal activo" },
          ].map(({ num, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-white font-bold text-lg w-14">{num}</span>
              <span className="text-white/40 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm p-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#2A5298" }}
            >
              <Heart size={16} className="text-white" fill="white" />
            </div>
            <span className="font-semibold text-slate-800">Acompáñame</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-500 mb-7">
            Ingresa tus credenciales para acceder al panel
          </p>

          {apiError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={15} className="shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${
                  errors.email ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full border rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors ${
                    errors.password
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200"
                  }`}
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full justify-center py-2.5"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar al panel"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            ¿Olvidaste tu contraseña?{" "}
            <a
              href="/forgot-password"
              className="text-blue-600 hover:underline"
            >
              Recupérala aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
