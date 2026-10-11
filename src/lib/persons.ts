/**
 * Nombres de los asistentes de una reserva de turismo. La app guarda
 * `{ name, tier }` por persona (reservas antiguas pueden ser texto plano).
 */
export function personNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((p) =>
      typeof p === "string"
        ? p
        : p && typeof p === "object" && "name" in p
          ? String((p as { name: unknown }).name ?? "")
          : "",
    )
    .map((n) => n.trim())
    .filter(Boolean);
}
