import type { ChangeEvent } from "react";

// Campos numéricos (cédula, teléfono, cuentas): el input nunca muestra
// letras, espacios ni símbolos, ni siquiera al pegar, y se corta en el largo
// máximo. La validación Zod de cada formulario sigue siendo la última palabra.

/** Largo máximo de cédula y teléfono (columnas varchar(10) del backend). */
export const ID_PHONE_MAX_DIGITS = 10;

/** Deja solo dígitos (y como máximo `max`) en lo que se escribe o pega. */
export const onlyDigits = (value: string, max = ID_PHONE_MAX_DIGITS) =>
  value.replace(/\D/g, "").slice(0, max);

type ChangeHandler = (e: ChangeEvent<HTMLInputElement>) => unknown;

/**
 * register() que limpia el valor antes de que react-hook-form lo lea.
 * Uso: `{...sanitized(register("phone"), onlyDigits)}`.
 */
export function sanitized<T extends { onChange: ChangeHandler }>(
  registration: T,
  clean: (value: string) => string,
): T {
  return {
    ...registration,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = clean(e.target.value);
      return registration.onChange(e);
    },
  };
}
