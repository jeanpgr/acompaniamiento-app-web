import type { ReactNode } from "react";

interface Props {
  /** id del control: une la etiqueta con el campo. */
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
  /** Mensaje de validación (react-hook-form: errors.campo?.message). */
  error?: string;
  /** Texto de ayuda bajo el campo cuando no hay error. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Etiqueta + control + mensaje de error, con el mismo formato en todo el panel. */
export default function FormField({
  htmlFor,
  label,
  required,
  error,
  hint,
  className,
  children,
}: Props) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink mb-1"
      >
        {label}
        {required && <span className="text-danger-fg"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-danger-fg text-xs mt-1">{error}</p>
      ) : (
        hint && <p className="text-xs text-ink-3 mt-1">{hint}</p>
      )}
    </div>
  );
}
