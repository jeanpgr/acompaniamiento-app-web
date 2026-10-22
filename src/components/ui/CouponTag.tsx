import { Ticket } from "lucide-react";
import Badge from "@/components/ui/Badge";

interface Props {
  code?: string | null;
  /** Descuento aplicado (decimal en texto, como llega del servidor). */
  discount?: string | null;
  className?: string;
}

const money = (v: string) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v));

/** Indica si la cita se contrató con un cupón de descuento y cuánto ahorró. */
export default function CouponTag({ code, discount, className = "" }: Props) {
  if (!code)
    return <span className={`text-xs text-ink-3 ${className}`}>Sin cupón</span>;
  return (
    <Badge variant="success" className={className}>
      <Ticket size={12} className="mr-1" aria-hidden="true" />
      {code}
      {discount && Number(discount) > 0 ? ` · −${money(discount)}` : ""}
    </Badge>
  );
}
