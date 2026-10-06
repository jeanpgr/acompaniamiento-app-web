// Enlaces de WhatsApp para escribirle a un cliente desde el panel.

/**
 * Teléfono de Ecuador como lo guarda la app ("0991234567", "991234567" o
 * "+593 99 123 4567") → número internacional sin signos ("593991234567").
 * null si no parece un celular válido.
 */
export function toWhatsappNumber(
  phone: string | null | undefined,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (/^5939\d{8}$/.test(digits)) return digits;
  if (/^09\d{8}$/.test(digits)) return `593${digits.slice(1)}`;
  if (/^9\d{8}$/.test(digits)) return `593${digits}`;
  return null;
}

/** https://wa.me/… con el mensaje ya escrito (null si el número no sirve). */
export function whatsappUrl(phone: string | null | undefined, text?: string) {
  const number = toWhatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
