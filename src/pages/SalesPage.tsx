import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, ShoppingCart, Eye } from "lucide-react";
import { toast } from "sonner";
import { getSales, updateSale, type Sale, type SalesStatus } from "@/api/sales";
import { getSalesDetailBySale } from "@/api/sales-detail";
import { getProducts } from "@/api/products";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const STATUS_CFG: Record<
  SalesStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING: { label: "Pendiente", bg: "#FEF9C3", color: "#854D0E" },
  COMPLETED: { label: "Completada", bg: "#D1FAE5", color: "#065F46" },
  CANCELLED: { label: "Cancelada", bg: "#FEE2E2", color: "#991B1B" },
};

function StatusBadge({ status }: { status: SalesStatus | null }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export default function SalesPage() {
  const qc = useQueryClient();
  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<Sale | null>(null);
  const [newStatus, setNewStatus] = useState<SalesStatus>("PENDING");

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: getSales,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  const { data: details = [], isLoading: detailsLoading } = useQuery({
    queryKey: ["sales-detail", detailSaleId],
    queryFn: () => getSalesDetailBySale(detailSaleId!),
    enabled: !!detailSaleId,
  });

  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? id.slice(0, 8) + "…";
  const selectedSale = sales.find((s) => s.id === detailSaleId);

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesStatus }) =>
      updateSale(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      setStatusModal(null);
      toast.success("Estado actualizado");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al actualizar",
      ),
  });

  const totals = {
    all: sales.length,
    pending: sales.filter((s) => s.status === "PENDING").length,
    completed: sales.filter((s) => s.status === "COMPLETED").length,
    cancelled: sales.filter((s) => s.status === "CANCELLED").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Ventas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Historial de ventas y gestión de estados
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: totals.all, color: "#1D3461" },
          { label: "Pendientes", value: totals.pending, color: "#854D0E" },
          { label: "Completadas", value: totals.completed, color: "#065F46" },
          { label: "Canceladas", value: totals.cancelled, color: "#991B1B" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl shadow-sm border border-slate-100 p-4"
          >
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando ventas...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  ID
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Usuario
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Subtotal
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Descuento
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Total
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Fecha
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-slate-500">
                      {sale.id.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-slate-500">
                      {sale.id_user.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">
                    $ {sale.subtotal}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-emerald-600">
                    - $ {sale.discount}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">
                    $ {sale.total}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={sale.status} />
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(sale.created_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setDetailSaleId(sale.id)}
                      >
                        <Eye size={12} /> Detalle
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setStatusModal(sale);
                          setNewStatus(sale.status ?? "PENDING");
                        }}
                      >
                        <Pencil size={12} /> Estado
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-8 text-center text-slate-400 text-sm"
                  >
                    <ShoppingCart
                      size={28}
                      className="mx-auto mb-2 text-slate-200"
                    />
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detalle de venta modal */}
      <Modal
        open={!!detailSaleId}
        onClose={() => setDetailSaleId(null)}
        title="Detalle de venta"
        footer={<Button onClick={() => setDetailSaleId(null)}>Cerrar</Button>}
      >
        {selectedSale && (
          <div className="flex gap-4 mb-4 pb-4 border-b border-slate-100">
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400">Subtotal</p>
              <p className="text-sm font-medium text-slate-700">
                $ {selectedSale.subtotal}
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400">Descuento</p>
              <p className="text-sm font-medium text-emerald-600">
                - $ {selectedSale.discount}
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-sm font-bold text-slate-800">
                $ {selectedSale.total}
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400">Estado</p>
              <StatusBadge status={selectedSale.status} />
            </div>
          </div>
        )}
        {detailsLoading ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Cargando detalle...
          </p>
        ) : details.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Sin ítems en esta venta
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Cant.</th>
                <th className="text-right py-2">P. Unit.</th>
                <th className="text-right py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-700 font-medium">
                    {productName(d.id_product)}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    {d.quantity}
                  </td>
                  <td className="py-2 text-right text-slate-600">
                    $ {d.unit_price}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-800">
                    $ {d.subtotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Cambiar estado modal */}
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title="Cambiar estado de venta"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModal(null)}>
              Cancelar
            </Button>
            <Button
              loading={updateMut.isPending}
              onClick={() =>
                statusModal &&
                updateMut.mutate({ id: statusModal.id, status: newStatus })
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {(["PENDING", "COMPLETED", "CANCELLED"] as SalesStatus[]).map((s) => (
            <label
              key={s}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newStatus === s ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <input
                type="radio"
                name="status"
                value={s}
                checked={newStatus === s}
                onChange={() => setNewStatus(s)}
                className="accent-blue-600"
              />
              <StatusBadge status={s} />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
