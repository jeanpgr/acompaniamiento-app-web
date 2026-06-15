import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Percent } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDiscountCoupons,
  createDiscountCoupon,
  updateDiscountCoupon,
  deleteDiscountCoupon,
  type DiscountCoupon,
  type CreateDiscountCouponInput,
} from "@/api/discount-coupons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

type ApiError = { response?: { data?: { message?: string } } };

const schema = z.object({
  coupon: z.string().min(1, "Código requerido").max(50),
  times_allowed: z.number().int().positive("Debe ser mayor a 0"),
  discount_percentage: z.number().int().min(1).max(100, "Máximo 100%"),
  expired_at: z.string().min(1, "Fecha de vencimiento requerida"),
});

type FormData = z.infer<typeof schema>;

const isExpired = (date: string) => new Date(date) < new Date();

export default function DiscountCouponsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountCoupon | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: getDiscountCoupons,
  });

  const createMut = useMutation({
    mutationFn: (data: CreateDiscountCouponInput) => createDiscountCoupon(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setModalOpen(false);
      toast.success("Cupón creado");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as ApiError)?.response?.data?.message ?? "Error al crear",
      ),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateDiscountCouponInput>;
    }) => updateDiscountCoupon(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setModalOpen(false);
      toast.success("Cupón actualizado");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as ApiError)?.response?.data?.message ?? "Error al actualizar",
      ),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDiscountCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Cupón eliminado");
    },
    onError: (err: unknown) =>
      toast.error(
        (err as ApiError)?.response?.data?.message ?? "Error al eliminar",
      ),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditTarget(null);
    reset({
      coupon: "",
      times_allowed: 1,
      discount_percentage: 10,
      expired_at: "",
    });
    setModalOpen(true);
  };
  const openEdit = (c: DiscountCoupon) => {
    setEditTarget(c);
    reset({
      coupon: c.coupon,
      times_allowed: c.times_allowed,
      discount_percentage: c.discount_percentage,
      expired_at: c.expired_at?.slice(0, 16) ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload: CreateDiscountCouponInput = {
      coupon: data.coupon.toUpperCase().trim(),
      times_allowed: data.times_allowed,
      discount_percentage: data.discount_percentage,
      expired_at: new Date(data.expired_at).toISOString(),
    };
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Cupones de descuento
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {coupons.length} cupones registrados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo cupón
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando cupones...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Código
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Percent size={12} /> Descuento
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Usos
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Vence
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-slate-500 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = isExpired(c.expired_at);
                const exhausted = c.times_used >= c.times_allowed;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded">
                        {c.coupon}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-emerald-600">
                      {c.discount_percentage}%
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {c.times_used} / {c.times_allowed}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">
                      {new Date(c.expired_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-5 py-3.5">
                      {expired || exhausted ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#FEE2E2",
                            color: "#991B1B",
                          }}
                        >
                          {expired ? "Vencido" : "Agotado"}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: "#D1FAE5",
                            color: "#065F46",
                          }}
                        >
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => openEdit(c)}>
                          <Pencil size={12} /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={
                            deleteMut.isPending && deleteMut.variables === c.id
                          }
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Eliminar el cupón "${c.coupon}"?`,
                              )
                            )
                              deleteMut.mutate(c.id);
                          }}
                        >
                          <Trash2 size={12} /> Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-400 text-sm"
                  >
                    No hay cupones registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? "Editar cupón" : "Nuevo cupón de descuento"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button loading={isPending} onClick={handleSubmit(onSubmit)}>
              {editTarget ? "Guardar cambios" : "Crear cupón"}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none uppercase ${errors.coupon ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              placeholder="VERANO20"
              {...register("coupon")}
            />
            {errors.coupon && (
              <p className="text-red-500 text-xs mt-1">
                {errors.coupon.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descuento (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.discount_percentage ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("discount_percentage", { valueAsNumber: true })}
              />
              {errors.discount_percentage && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.discount_percentage.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usos permitidos <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.times_allowed ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                {...register("times_allowed", { valueAsNumber: true })}
              />
              {errors.times_allowed && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.times_allowed.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha de vencimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${errors.expired_at ? "border-red-400 bg-red-50" : "border-slate-200"}`}
              {...register("expired_at")}
            />
            {errors.expired_at && (
              <p className="text-red-500 text-xs mt-1">
                {errors.expired_at.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
