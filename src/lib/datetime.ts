// Conversión entre las fechas ISO (UTC) del backend y los <input
// type="datetime-local">, que trabajan en la hora local del navegador.
// Cortar el ISO (`iso.slice(0, 16)`) muestra la hora UTC como si fuera local:
// en Ecuador (UTC-5) cada guardado movía el evento 5 horas.

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO del backend → "YYYY-MM-DDTHH:mm" en hora local (vacío si no hay fecha). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor de un datetime-local (hora local) → ISO UTC para la API. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/** El valor es una fecha válida. */
export function isValidLocalInput(value: string): boolean {
  return !!value && !Number.isNaN(new Date(value).getTime());
}

/** La fecha local ya pasó (la app móvil solo muestra eventos futuros). */
export function isPastLocalInput(value: string, now = new Date()): boolean {
  return new Date(value).getTime() <= now.getTime();
}
