import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "danger-soft" | "ghost";
  /**
   * "icon": cuadrado de 36 px solo con icono (acciones de fila). Exige
   * `aria-label` y `title` para que tenga nombre accesible y tooltip.
   */
  size?: "sm" | "md" | "icon";
  loading?: boolean;
}

// Mismas variantes que el Button de la app móvil: primario azul con
// relieve, secundario delineado en azul y destructivo en coral.
const VARIANTS = {
  primary:
    "bg-primary text-white shadow-raised hover:bg-primary-hover active:bg-sidebar",
  secondary:
    "bg-surface border-[1.5px] border-line-strong text-primary hover:bg-primary-soft hover:border-primary/40 active:bg-primary-soft",
  danger:
    "bg-danger text-white shadow-raised hover:bg-danger-hover active:bg-danger-hover",
  // Acción destructiva dentro de filas/listas: presente pero sin gritar
  "danger-soft": "text-danger-fg hover:bg-danger-bg active:bg-danger-bg",
  ghost: "text-primary hover:bg-primary-soft active:bg-primary-soft",
};

const SIZES = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  icon: "h-9 w-9 shrink-0",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-(--duration-feedback) ease-out-quart active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {/* En el botón de solo icono, el spinner ocupa el lugar del icono. */}
      {!(loading && size === "icon") && children}
    </button>
  );
}
