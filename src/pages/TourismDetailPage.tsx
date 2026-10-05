import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import {
  getDetailsTourismPage,
  createDetailTourism,
  updateDetailTourism,
  deleteDetailTourism,
  type DetailTourism,
  type CreateDetailTourismInput,
} from "@/api/details-tourism";
import { getServices } from "@/api/services";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import CursorPagination from "@/components/ui/CursorPagination";
import TourismList from "@/components/tourism/TourismList";
import TourismFormModal from "@/components/tourism/TourismFormModal";
import {
  toPayload,
  type TourismFormValues,
} from "@/components/tourism/tourismForm";

export default function TourismDetailPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");
  const [search, setSearch] = useState("");
  const [view, setView] = useViewMode();

  // Modal: `formKey` cambia en cada apertura para que el formulario empiece limpio.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTourism | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Con ?service= se listan solo las del servicio (filtro en el servidor).
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["detail-tourism", { id_service: serviceId, search: debouncedSearch }],
    (cursor) =>
      getDetailsTourismPage(cursor, {
        id_service: serviceId ?? undefined,
        search: debouncedSearch,
      }),
  );
  const { items, isLoading } = pager;

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });
  const currentService = serviceId
    ? services.find((s) => s.id === serviceId)
    : null;

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──────────
  const createMut = useMutation({
    mutationFn: createDetailTourism,
    meta: {
      invalidates: "detail-tourism",
      successMessage: "Excursión creada correctamente",
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
      data: Partial<CreateDetailTourismInput>;
    }) => updateDetailTourism(id, data),
    meta: {
      invalidates: "detail-tourism",
      successMessage: "Excursión actualizada",
      errorMessage: "Error al actualizar",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTourism,
    meta: {
      invalidates: "detail-tourism",
      successMessage: "Excursión eliminada",
      errorMessage: "Error al eliminar",
    },
  });

  const openForm = (item: DetailTourism | null) => {
    setEditTarget(item);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const submitForm = (data: TourismFormValues) => {
    const payload = toPayload(data, editTarget);
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  const confirmDelete = async (item: DetailTourism) => {
    if (await confirm({ title: `¿Eliminar "${item.name}"?` }))
      deleteMut.mutate(item.id);
  };

  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay excursiones registradas";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          {serviceId && (
            <button
              type="button"
              onClick={() => navigate("/services")}
              className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink-2 mb-1 transition-colors"
            >
              <ArrowLeft size={12} /> Volver a servicios
            </button>
          )}
          <h1 className="text-xl font-semibold text-ink">
            {currentService
              ? `Turismo · ${currentService.name}`
              : "Detalles de turismo"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {serviceId
              ? "Excursiones y salidas de este servicio turístico"
              : "Gestiona excursiones y salidas turísticas"}
          </p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus size={14} /> Nueva excursión
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, descripción o punto de encuentro"
          label="Buscar excursiones"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando excursiones…" />
        ) : (
          <TourismList
            items={items}
            view={view}
            emptyText={emptyText}
            renderActions={(item) => (
              <>
                <Button size="sm" variant="secondary" onClick={() => openForm(item)}>
                  <Pencil size={12} /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger-soft"
                  loading={deleteMut.isPending && deleteMut.variables === item.id}
                  onClick={() => confirmDelete(item)}
                >
                  <Trash2 size={12} /> Eliminar
                </Button>
              </>
            )}
          />
        )}
        {!isLoading && <CursorPagination pager={pager} />}
      </div>

      <TourismFormModal
        key={formKey}
        open={modalOpen}
        item={editTarget}
        serviceId={serviceId}
        services={services}
        pending={createMut.isPending || updateMut.isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={submitForm}
      />
    </div>
  );
}
