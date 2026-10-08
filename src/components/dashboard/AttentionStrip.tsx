import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CheckCircle2,
  PackageX,
  Truck,
  Undo2,
  ShoppingBag,
} from "lucide-react";
import type { DashboardData } from "@/api/dashboard";
import { KIND_META, KIND_ORDER } from "./format";

// Dónde se resuelve cada pago por confirmar.
const PAYMENT_ROUTE = {
  acompan: "/distribution",
  tourism: "/tourism-details",
  training: "/training-details",
  daycare: "/daycare-details",
} as const;

function Item({
  icon: Icon,
  count,
  label,
  to,
  children,
}: {
  icon: LucideIcon;
  count: number;
  label: string;
  to: string;
  children?: ReactNode;
}) {
  const pending = count > 0;
  return (
    <div
      className={`rounded-xl border p-4 min-w-0 ${
        pending
          ? "border-warning/40 bg-warning-bg/50"
          : "border-line bg-surface"
      }`}
    >
      <Link
        to={to}
        className="group flex items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <span
          className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
            pending
              ? "bg-warning-bg text-warning-fg"
              : "bg-success-bg text-success-fg"
          }`}
          aria-hidden="true"
        >
          {pending ? <Icon size={18} /> : <CheckCircle2 size={18} />}
        </span>
        <span className="min-w-0">
          <span className="block text-2xl font-semibold text-ink leading-tight">
            {count}
          </span>
          <span className="block text-sm text-ink-2 group-hover:underline">
            {label}
          </span>
          {!pending && <span className="block text-xs text-ink-3">Al día</span>}
        </span>
      </Link>
      {children}
    </div>
  );
}

/**
 * Lo que espera una acción del equipo ahora mismo (no depende del periodo).
 * Cada bloque lleva a la pantalla donde se resuelve.
 */
export default function AttentionStrip({
  attention,
  lowStock,
}: Pick<DashboardData, "attention" | "lowStock">) {
  const payments = attention.pendingPayments;
  const totalPayments = KIND_ORDER.reduce((n, k) => n + payments[k], 0);

  return (
    <section aria-labelledby="attention-title" className="mb-6">
      <h2 id="attention-title" className="text-sm font-semibold text-ink mb-3">
        Requiere atención{" "}
        <span className="font-normal text-ink-3">· ahora</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Item
          icon={BadgeDollarSign}
          count={totalPayments}
          label="Pagos por confirmar"
          to={
            PAYMENT_ROUTE[KIND_ORDER.find((k) => payments[k] > 0) ?? "tourism"]
          }
        >
          {totalPayments > 0 && (
            <ul className="mt-2 space-y-0.5">
              {KIND_ORDER.filter((k) => payments[k] > 0).map((k) => (
                <li key={k}>
                  <Link
                    to={PAYMENT_ROUTE[k]}
                    className="flex items-center gap-1.5 text-xs text-ink-2 hover:underline"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: KIND_META[k].color }}
                      aria-hidden="true"
                    />
                    {KIND_META[k].label}
                    <span className="font-semibold text-ink tabular-nums">
                      {payments[k]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Item>
        <Item
          icon={Undo2}
          count={attention.refundsPending}
          label="Reembolsos por hacer"
          to="/distribution"
        />
        <Item
          icon={ShoppingBag}
          count={attention.ordersToDeliver}
          label="Pedidos por entregar"
          to="/sales"
        />
        <Item
          icon={Truck}
          count={attention.acompanWithoutVehicle}
          label="Acompañamientos sin vehículo (48 h)"
          to="/distribution"
        />
        <Item
          icon={PackageX}
          count={lowStock.length}
          label="Productos con poco stock"
          to="/products"
        >
          {lowStock.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {lowStock.slice(0, 3).map((p) => (
                <li key={p.id} className="flex justify-between gap-2 text-xs">
                  <span className="text-ink-2 truncate">{p.name}</span>
                  <span className="font-semibold text-ink tabular-nums shrink-0">
                    {p.stock} u.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Item>
      </div>
    </section>
  );
}
