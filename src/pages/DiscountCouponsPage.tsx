import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Percent, Dices } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getDiscountCouponsPage,
  createDiscountCoupon,
  updateDiscountCoupon,
  deleteDiscountCoupon,
  type DiscountCoupon,
  type CreateDiscountCouponInput,
} from "@/api/discount-coupons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";
import Badge from "@/components/ui/Badge";
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

const schema = z.object({
  coupon: z.string().min(1, "Código requerido").max(50),
  times_allowed: z.number().int().positive("Debe ser mayor a 0"),
  discount_percentage: z.number().int().min(1).max(100, "Máximo 100%"),
  expired_at: z.string().min(1, "Fecha de vencimiento requerida"),
});

type FormData = z.infer<typeof schema>;

const isExpired = (date: string) => new Date(date) < new Date();

// Sin 0/O ni 1/I para que el código no se confunda al dictarlo o digitarlo.
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";
const CODE_CHARS = CODE_LETTERS + CODE_DIGITS;
const CODE_LENGTH = 5;

// Código aleatorio de 5 caracteres con al menos una letra y un número.
const generateCouponCode = () => {
  const bytes = new Uint32Array(CODE_LENGTH);
  for (;;) {
    crypto.getRandomValues(bytes);
    const code = Array.from(
      bytes,
      (b) => CODE_CHARS[b % CODE_CHARS.length],
    ).join("");
    if (/[A-Z]/.test(code) && /\d/.test(code)) return code;
  }
};

export default function DiscountCouponsPage() {
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountCoupon | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["coupons", { search: debouncedSearch }],
    (cursor) => getDiscountCouponsPage(cursor, { search: debouncedSearch }),
  );
  const { items: coupons, isLoading } = pager;

  const createMut = useMutation({
    mutationFn: (data: CreateDiscountCouponInput) => createDiscountCoupon(data),
    meta: {
      invalidates: "coupons",
      successMessage: "Cupón creado",
      errorMessage: "Error al crear",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateDiscountCouponInput>;
    }) => updateDiscountCoupon(id, data),
    meta: {
      invalidates: "coupons",
      successMessage: "Cupón actualizado",
      errorMessage: "Error al actualizar",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDiscountCoupon,
    meta: {
      invalidates: "coupons",
      successMessage: "Cupón eliminado",
      errorMessage: "Error al eliminar",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay cupones registrados";

  const renderStatus = (c: DiscountCoupon) => {
    const expired = isExpired(c.expired_at);
    const exhausted = c.times_used >= c.times_allowed;
    return expired || exhausted ? (
      <Badge variant="danger">{expired ? "Vencido" : "Agotado"}</Badge>
    ) : (
      <Badge variant="success">Activo</Badge>
    );
  };

  const renderActions = (c: DiscountCoupon) => (
    <>
      <Button
        size="icon"
        aria-label={`Editar cupón ${c.coupon}`}
        title="Editar"
        variant="secondary"
        onClick={() => openEdit(c)}
      >
        <Pencil size={14} aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        aria-label={`Eliminar cupón ${c.coupon}`}
        title="Eliminar"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === c.id}
        onClick={async () => {
          if (await confirm({ title: `¿Eliminar el cupón "${c.coupon}"?` }))
            deleteMut.mutate(c.id);
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Cupones de descuento
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {pager.total} cupones registrados
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo cupón
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código"
          label="Buscar cupones"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando cupones…" />
        ) : view === "grid" ? (
          <CardGrid empty={coupons.length === 0 && emptyText}>
            {coupons.map((c) => (
              <GridCard key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono font-semibold text-ink text-sm bg-line px-2 py-0.5 rounded">
                    {c.coupon}
                  </span>
                  {renderStatus(c)}
                </div>
                <p className="text-2xl font-bold text-success-fg tabular-nums">
                  {c.discount_percentage}%
                </p>
                <CardFields>
                  <CardField label="Usos">
                    {c.times_used} / {c.times_allowed}
                  </CardField>
                  <CardField label="Vence">
                    {new Date(c.expired_at).toLocaleDateString("es-CO")}
                  </CardField>
                </CardFields>
                <CardActions>{renderActions(c)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Código
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  <div className="flex items-center gap-1">
                    <Percent size={12} /> Descuento
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Usos
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Vence
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line/70 hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-semibold text-ink text-sm bg-line px-2 py-0.5 rounded">
                      {c.coupon}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-success-fg">
                    {c.discount_percentage}%
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-2">
                    {c.times_used} / {c.times_allowed}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {new Date(c.expired_at).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-3.5">{renderStatus(c)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">{renderActions(c)}</div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!isLoading && <CursorPagination pager={pager} />}
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
            <label
              htmlFor="discountcoupons-coupon"
              className="block text-sm font-medium text-ink mb-1"
            >
              Código <span className="text-danger-fg">*</span>
            </label>
            <div className="relative">
              <input
                id="discountcoupons-coupon"
                className={`field font-mono uppercase ${editTarget ? "" : "pr-11"}`}
                aria-invalid={!!errors.coupon}
                placeholder="VERANO20"
                {...register("coupon")}
              />
              {!editTarget && (
                <button
                  type="button"
                  aria-label="Generar código aleatorio"
                  title="Generar código aleatorio"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-2"
                  onClick={() =>
                    setValue("coupon", generateCouponCode(), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <Dices size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            {errors.coupon && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.coupon.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="discountcoupons-discount_percentage"
                className="block text-sm font-medium text-ink mb-1"
              >
                Descuento (%) <span className="text-danger-fg">*</span>
              </label>
              <input
                id="discountcoupons-discount_percentage"
                type="number"
                min={1}
                max={100}
                className="field"
                aria-invalid={!!errors.discount_percentage}
                {...register("discount_percentage", { valueAsNumber: true })}
              />
              {errors.discount_percentage && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.discount_percentage.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="discountcoupons-times_allowed"
                className="block text-sm font-medium text-ink mb-1"
              >
                Usos permitidos <span className="text-danger-fg">*</span>
              </label>
              <input
                id="discountcoupons-times_allowed"
                type="number"
                min={1}
                className="field"
                aria-invalid={!!errors.times_allowed}
                {...register("times_allowed", { valueAsNumber: true })}
              />
              {errors.times_allowed && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.times_allowed.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="discountcoupons-expired_at"
              className="block text-sm font-medium text-ink mb-1"
            >
              Fecha de vencimiento <span className="text-danger-fg">*</span>
            </label>
            <input
              id="discountcoupons-expired_at"
              type="datetime-local"
              className="field"
              aria-invalid={!!errors.expired_at}
              {...register("expired_at")}
            />
            {errors.expired_at && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.expired_at.message}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
