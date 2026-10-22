/**
 * Colores para distinguir los planes de guardería en la app móvil. Paleta
 * cerrada: la app los usa como fondo tenue y borde, así el texto oscuro se
 * lee bien. Mantener igual a `src/theme/planColors.ts` de la app móvil.
 */
export const PLAN_COLORS = [
  { hex: "#2563EB", name: "Azul" },
  { hex: "#0D9488", name: "Turquesa" },
  { hex: "#16A34A", name: "Verde" },
  { hex: "#CA8A04", name: "Dorado" },
  { hex: "#F97316", name: "Naranja" },
  { hex: "#DC2626", name: "Rojo" },
  { hex: "#DB2777", name: "Rosa" },
  { hex: "#7C3AED", name: "Morado" },
] as const;

/** Nombre del color para lectores de pantalla ("" si no es de la paleta). */
export const planColorName = (hex: string | undefined | null) =>
  PLAN_COLORS.find((c) => c.hex === hex)?.name ?? "";
