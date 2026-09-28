import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  ShoppingCart,
  Eye,
  Search,
  Phone,
  MapPin,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSales,
  updateSaleStatus,
  SALE_STATUS_TRANSITIONS,
  type Order,
  type SalesStatus,
} from "@/api/sales";
import { getErrorMessage } from "@/api/client";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import TableSkeleton from "@/components/ui/TableSkeleton";

const STATUS_CFG: Record<
  SalesStatus,
  {
    label: string;
    variant: "warning" | "info" | "success" | "danger";
    color: string;
  }
> = {
  POR_ENTREGAR: {
    label: "Por entregar",
    variant: "warning",
    color: "text-warning-fg",
  },
  EN_ENTREGA: {
    label: "En proceso de entrega",
    variant: "info",
    color: "text-info-fg",
  },
  ENTREGADO: {
    label: "Entregado",
    variant: "success",
    color: "text-success-fg",
  },
  CANCELADO: { label: "Cancelado", variant: "danger", color: "text-danger-fg" },
};
const STATUSES = Object.keys(STATUS_CFG) as SalesStatus[];

function StatusBadge({ status }: { status: SalesStatus }) {
  const cfg = STATUS_CFG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const money = (n: number) =>
  `$ ${n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const customerName = (o: Order) =>
  o.customer
    ? [o.customer.name, o.customer.lastname].filter(Boolean).join(" ")
    : "—";

export default function SalesPage() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<Order | null>(null);
  const [statusTarget, setStatusTarget] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<SalesStatus | null>(null);
  const [observation, setObservation] = useState("");
  const [filter, setFilter] = useState<SalesStatus | "all">("all");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: getSales,
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      status,
      obs,
    }: {
      id: string;
      status: SalesStatus;
      obs?: string;
    }) => updateSaleStatus(id, status, obs),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      // Cancelar devuelve stock: el inventario de productos cambia.
      qc.invalidateQueries({ queryKey: ["products"] });
      setStatusTarget(null);
      toast.success(`Pedido #${order.code}: ${order.status_label}`);
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "No se pudo actualizar el estado")),
  });

  const openStatus = (o: Order) => {
    setStatusTarget(o);
    setNewStatus(null);
    setObservation(o.observation ?? "");
  };

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]),
  ) as Record<SalesStatus, number>;

  const q = search.trim().toLowerCase();
  const filtered = orders.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!q ||
        o.code.toLowerCase().includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        (o.customer?.phone ?? "").includes(q)),
  );

  const allowed = statusTarget
    ? SALE_STATUS_TRANSITIONS[statusTarget.status]
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Ventas</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          Pedidos de la tienda y estado de entrega
        </p>
      </div>

      {/* Stats: también funcionan como filtro */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {[
          {
            key: "all" as const,
            label: "Total",
            value: orders.length,
            color: "text-ink",
          },
          ...STATUSES.map((s) => ({
            key: s,
            label: STATUS_CFG[s].label,
            value: counts[s],
            color: STATUS_CFG[s].color,
          })),
        ].map(({ key, label, value, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`text-left bg-surface rounded-xl shadow-sm border p-4 transition-colors ${
              filter === key
                ? "border-primary ring-1 ring-primary"
                : "border-line hover:bg-surface-2"
            }`}
          >
            <p className="text-xs text-ink-3 mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>
              {value}
            </p>
          </button>
        ))}
      </div>

      <div className="relative mb-4 w-64">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pedido, cliente o teléfono"
          aria-label="Buscar pedidos"
          className="pl-8 pr-3 py-1.5 text-sm border border-line rounded-lg bg-surface focus:outline-none w-full"
        />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando ventas…" />
        ) : (
          <table className="w-full min-w-180">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                {[
                  "Pedido",
                  "Cliente",
                  "Artículos",
                  "Total",
                  "Estado",
                  "Fecha",
                  "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-ink-3 px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const units = o.items.reduce((n, it) => n + it.quantity, 0);
                const final = SALE_STATUS_TRANSITIONS[o.status].length === 0;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-line/70 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-ink">
                        #{o.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-ink">
                        {customerName(o)}
                      </p>
                      <p className="text-xs text-ink-3">
                        {o.customer?.phone ?? o.customer?.email ?? ""}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-2">
                      {units} {units === 1 ? "unidad" : "unidades"}
                      <span className="block text-xs text-ink-3 truncate max-w-48">
                        {o.items.map((it) => it.name).join(", ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-ink tabular-nums">
                      {money(o.total)}
                      {o.discount > 0 && (
                        <span className="block text-xs font-normal text-success-fg">
                          − {money(o.discount)}
                          {o.coupon ? ` · ${o.coupon}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">
                      {new Date(o.created_at).toLocaleString("es-EC", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDetail(o)}
                        >
                          <Eye size={12} /> Detalle
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={final}
                          title={
                            final
                              ? "Estado final: no se puede cambiar"
                              : undefined
                          }
                          onClick={() => openStatus(o)}
                        >
                          <Pencil size={12} /> Estado
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    <ShoppingCart
                      size={28}
                      className="mx-auto mb-2 text-line-strong"
                    />
                    {orders.length === 0
                      ? "No hay ventas registradas"
                      : "Ningún pedido coincide con el filtro"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detalle */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Pedido #${detail.code}` : "Pedido"}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={detail.status} />
              <span className="text-xs text-ink-3">
                {new Date(detail.created_at).toLocaleString("es-EC", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>

            {detail.customer && (
              <div className="rounded-lg border border-line p-3 space-y-1.5 text-sm">
                <p className="font-medium text-ink">{customerName(detail)}</p>
                {detail.customer.phone && (
                  <a
                    href={`tel:${detail.customer.phone}`}
                    className="flex items-center gap-2 text-info-fg hover:underline"
                  >
                    <Phone size={13} /> {detail.customer.phone}
                  </a>
                )}
                <p className="flex items-center gap-2 text-ink-2">
                  <Mail size={13} /> {detail.customer.email}
                </p>
                {detail.customer.address && (
                  <p className="flex items-start gap-2 text-ink-2">
                    <MapPin size={13} className="mt-0.5 shrink-0" />{" "}
                    {detail.customer.address}
                  </p>
                )}
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Cant.</th>
                  <th className="text-right py-2">P. Unit.</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id} className="border-b border-line/70">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {it.photo ? (
                          <img
                            src={it.photo}
                            alt=""
                            className="w-8 h-8 rounded object-cover bg-line"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded bg-line"
                            aria-hidden="true"
                          />
                        )}
                        <span className="text-ink font-medium">{it.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-ink-2 tabular-nums">
                      {it.quantity}
                    </td>
                    <td className="py-2 text-right text-ink-2 tabular-nums">
                      {money(it.unit_price)}
                    </td>
                    <td className="py-2 text-right font-medium text-ink tabular-nums">
                      {money(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="text-sm space-y-1 ml-auto w-56">
              <div className="flex justify-between">
                <dt className="text-ink-3">Subtotal</dt>
                <dd className="tabular-nums">{money(detail.subtotal)}</dd>
              </div>
              {detail.discount > 0 && (
                <div className="flex justify-between text-success-fg">
                  <dt>Descuento{detail.coupon ? ` (${detail.coupon})` : ""}</dt>
                  <dd className="tabular-nums">− {money(detail.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold text-ink border-t border-line pt-1">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(detail.total)}</dd>
              </div>
            </dl>

            {detail.observation && (
              <p className="text-sm text-ink-2 bg-surface-2 rounded-lg p-3">
                <span className="text-ink-3">Observación: </span>
                {detail.observation}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Cambiar estado: solo transiciones válidas */}
      <Modal
        open={!!statusTarget}
        onClose={() => !updateMut.isPending && setStatusTarget(null)}
        title={
          statusTarget ? `Estado del pedido #${statusTarget.code}` : "Estado"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setStatusTarget(null)}
              disabled={updateMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              loading={updateMut.isPending}
              disabled={!newStatus}
              variant={newStatus === "CANCELADO" ? "danger" : "primary"}
              onClick={() =>
                statusTarget &&
                newStatus &&
                updateMut.mutate({
                  id: statusTarget.id,
                  status: newStatus,
                  obs: observation.trim() || undefined,
                })
              }
            >
              {newStatus === "CANCELADO" ? "Cancelar pedido" : "Guardar"}
            </Button>
          </>
        }
      >
        {statusTarget && (
          <div className="space-y-3">
            <p className="text-sm text-ink-2 flex items-center gap-2">
              Estado actual: <StatusBadge status={statusTarget.status} />
            </p>
            <div
              role="radiogroup"
              aria-label="Nuevo estado"
              className="space-y-2"
            >
              {allowed.map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    newStatus === s
                      ? "border-info bg-info-bg"
                      : "border-line hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={newStatus === s}
                    onChange={() => setNewStatus(s)}
                    className="accent-primary"
                  />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
            {newStatus === "CANCELADO" && (
              <p
                className="flex items-start gap-2 text-sm text-danger-fg bg-danger-bg rounded-lg p-3"
                role="alert"
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                Se devolverá el stock de los productos y el uso del cupón. Esta
                acción no se puede deshacer.
              </p>
            )}
            {newStatus === "ENTREGADO" && (
              <p className="text-xs text-ink-3">
                Entregado es un estado final: después no se podrá cambiar.
              </p>
            )}
            <div>
              <label
                htmlFor="sale-observation"
                className="block text-sm font-medium text-ink mb-1"
              >
                Observación (opcional)
              </label>
              <textarea
                id="sale-observation"
                className="field min-h-20"
                maxLength={250}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ej. entregado a un familiar, cliente no estaba…"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
