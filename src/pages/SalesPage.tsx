import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Pencil,
  ShoppingCart,
  Eye,
  Phone,
  MapPin,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSalesPage,
  updateSaleStatus,
  SALE_STATUS_TRANSITIONS,
  type Order,
  type SalesStatus,
} from "@/api/sales";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ZoomableImage from "@/components/ui/ZoomableImage";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
  CardActions,
} from "@/components/ui/CardGrid";
import CursorPagination from "@/components/ui/CursorPagination";
import AddressMapButton from "@/components/ui/AddressMapButton";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";

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
  const [detail, setDetail] = useState<Order | null>(null);
  const [statusTarget, setStatusTarget] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<SalesStatus | null>(null);
  const [observation, setObservation] = useState("");
  const [filter, setFilter] = useState<SalesStatus | "all">("all");
  const [search, setSearch] = useState("");

  // Búsqueda y estado se filtran en el servidor (paginación por cursor);
  // los conteos por estado respetan la búsqueda.
  const debouncedSearch = useDebouncedValue(search.trim());
  const status = filter === "all" ? undefined : filter;
  const pager = useCursorPagination(
    ["sales", { search: debouncedSearch, status }],
    (cursor) => getSalesPage(cursor, { search: debouncedSearch, status }),
    // Las compras nuevas llegan desde la app sin que el panel haga nada.
    { refetchInterval: LIVE_REFETCH_MS },
  );
  const { items: filtered, isLoading } = pager;

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
    meta: {
      // Cancelar repone stock y el uso del cupón: refresca productos y cupones.
      invalidates: "sales",
      errorMessage: "No se pudo actualizar el estado",
    },
    onSuccess: (order) => {
      setStatusTarget(null);
      // El mensaje depende del pedido devuelto: va aquí y no en meta.
      toast.success(`Pedido #${order.code}: ${order.status_label}`);
    },
  });

  const openStatus = (o: Order) => {
    setStatusTarget(o);
    setNewStatus(null);
    setObservation(o.observation ?? "");
  };

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, pager.counts?.[s] ?? 0]),
  ) as Record<SalesStatus, number>;
  const totalOrders = STATUSES.reduce((sum, s) => sum + counts[s], 0);

  const [view, setView] = useViewMode("2xl");
  const emptyText =
    filter === "all" && !debouncedSearch
      ? "No hay ventas registradas"
      : "Ningún pedido coincide con el filtro";

  const units = (o: Order) => o.items.reduce((n, it) => n + it.quantity, 0);
  const formatDate = (o: Order) =>
    new Date(o.created_at).toLocaleString("es-EC", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const renderTotal = (o: Order) => (
    <>
      {money(o.total)}
      {o.discount > 0 && (
        <span className="block text-xs font-normal text-success-fg">
          − {money(o.discount)}
          {o.coupon ? ` · ${o.coupon}` : ""}
        </span>
      )}
    </>
  );

  const renderActions = (o: Order) => {
    const final = SALE_STATUS_TRANSITIONS[o.status].length === 0;
    return (
      <>
        <Button size="sm" variant="secondary" onClick={() => setDetail(o)}>
          <Eye size={14} /> Detalle
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={final}
          title={final ? "Estado final: no se puede cambiar" : undefined}
          onClick={() => openStatus(o)}
        >
          <Pencil size={14} /> Estado
        </Button>
      </>
    );
  };

  const allowed = statusTarget
    ? SALE_STATUS_TRANSITIONS[statusTarget.status]
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Ventas</h1>
        <p className="text-[15px] text-ink-3 mt-1">
          Pedidos de la tienda y estado de entrega
        </p>
      </div>

      {/* Stats: también funcionan como filtro */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {[
          {
            key: "all" as const,
            label: "Total",
            value: totalOrders,
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
            className={`text-left card p-4 transition-[box-shadow,background-color] ${
              filter === key
                ? "ring-2 ring-primary bg-primary-soft/40"
                : "hover:shadow-md"
            }`}
          >
            <p className="text-[13px] font-semibold text-ink-3 mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>
              {value}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, cliente o teléfono"
          label="Buscar pedidos"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando ventas…" />
        ) : view === "grid" ? (
          <CardGrid empty={filtered.length === 0 && emptyText}>
            {filtered.map((o) => (
              <GridCard key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-md whitespace-nowrap">
                    #{o.code}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    {customerName(o)}
                  </h2>
                  <p className="text-xs text-ink-3">
                    {o.customer?.phone ?? o.customer?.email ?? ""}
                  </p>
                </div>
                <CardFields>
                  <CardField label="Artículos">
                    {units(o)} {units(o) === 1 ? "unidad" : "unidades"}
                    <span className="block text-xs text-ink-3 line-clamp-2">
                      {o.items.map((it) => it.name).join(", ")}
                    </span>
                  </CardField>
                  <CardField label="Total">
                    <span className="font-semibold tabular-nums">
                      {renderTotal(o)}
                    </span>
                  </CardField>
                  <CardField label="Fecha">{formatDate(o)}</CardField>
                </CardFields>
                <CardActions>{renderActions(o)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
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
                    className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-line/70 transition-colors hover:bg-primary-soft/50"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-md whitespace-nowrap">
                      #{o.code}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-ink">
                      {customerName(o)}
                    </p>
                    <p className="text-xs text-ink-3">
                      {o.customer?.phone ?? o.customer?.email ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-2">
                    {units(o)} {units(o) === 1 ? "unidad" : "unidades"}
                    <span className="block text-xs text-ink-3 truncate max-w-48">
                      {o.items.map((it) => it.name).join(", ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-ink tabular-nums">
                    {renderTotal(o)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-3">
                    {formatDate(o)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">{renderActions(o)}</div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-ink-3 text-[15px]"
                  >
                    <ShoppingCart
                      size={28}
                      className="mx-auto mb-2 text-line-strong"
                    />
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!isLoading && <CursorPagination pager={pager} />}
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
              <div className="rounded-xl bg-surface-2 p-4 space-y-1.5 text-sm">
                <p className="font-bold text-ink text-base">
                  {customerName(detail)}
                </p>
                {detail.customer.phone && (
                  <a
                    href={`tel:${detail.customer.phone}`}
                    className="flex items-center gap-2 text-info-fg hover:underline"
                  >
                    <Phone size={15} /> {detail.customer.phone}
                  </a>
                )}
                <p className="flex items-center gap-2 text-ink-2">
                  <Mail size={15} /> {detail.customer.email}
                </p>
                {detail.customer.address && (
                  <div className="flex flex-wrap items-start gap-2 text-ink-2">
                    <p className="flex items-start gap-2 min-w-0 flex-1">
                      <MapPin size={15} className="mt-0.5 shrink-0" />{" "}
                      {detail.customer.address}
                    </p>
                    <AddressMapButton
                      title={`Dirección de ${customerName(detail)}`}
                      points={[
                        {
                          label: "Dirección del cliente",
                          address: detail.customer.address,
                          lat: detail.customer.address_lat,
                          lng: detail.customer.address_lng,
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-[13px] font-semibold text-ink-2">
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
                          <ZoomableImage
                            src={it.photo}
                            alt={it.name}
                            buttonClassName="rounded-lg"
                            className="w-10 h-10 rounded-lg object-cover bg-line"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg bg-line"
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
              <p className="text-sm text-ink-2 bg-surface-2 rounded-xl p-4">
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
                  className={`flex items-center gap-3 p-3 rounded-xl border-[1.5px] cursor-pointer transition-colors ${
                    newStatus === s
                      ? "border-primary bg-primary-soft"
                      : "border-line hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={newStatus === s}
                    onChange={() => setNewStatus(s)}
                    className="accent-primary w-5 h-5"
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
                className="block text-sm font-semibold text-ink mb-1.5"
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
