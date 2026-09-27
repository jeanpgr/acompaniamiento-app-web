import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "danger-soft" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-sidebar",
  secondary:
    "bg-surface border border-line text-ink-2 hover:bg-surface-2 hover:border-line-strong active:bg-line",
  danger: "bg-danger text-white hover:bg-danger-hover active:bg-danger-fg",
  // Acción destructiva dentro de filas/listas: presente pero sin gritar
  "danger-soft": "text-danger-fg hover:bg-danger-bg active:bg-danger-bg",
  ghost: "text-ink-2 hover:bg-surface-2 active:bg-line",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors duration-150 ease-out-quart disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
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
      {children}
    </button>
  );
}
