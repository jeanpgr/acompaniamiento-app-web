import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import {
  getDetailsTrainingPage,
  createDetailTraining,
  updateDetailTraining,
  deleteDetailTraining,
  type DetailTraining,
  type CreateDetailTrainingInput,
} from "@/api/details-training";
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
import TrainingList from "@/components/training/TrainingList";
import TrainingFormModal from "@/components/training/TrainingFormModal";
import {
  toPayload,
  type TrainingFormValues,
} from "@/components/training/trainingForm";

export default function TrainingDetailPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("service");
  const [search, setSearch] = useState("");
  const [view, setView] = useViewMode();

  // Modal: `formKey` cambia en cada apertura para que el formulario empiece limpio.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DetailTraining | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Con ?service= se listan solo las del servicio (filtro en el servidor).
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["detail-training", { id_service: serviceId, search: debouncedSearch }],
    (cursor) =>
      getDetailsTrainingPage(cursor, {
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
    mutationFn: createDetailTraining,
    meta: {
      invalidates: "detail-training",
      successMessage: "Capacitación creada correctamente",
      errorMessage: "Error al crear la capacitación",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateDetailTrainingInput>;
    }) => updateDetailTraining(id, data),
    meta: {
      invalidates: "detail-training",
      successMessage: "Capacitación actualizada",
      errorMessage: "Error al actualizar la capacitación",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteDetailTraining,
    meta: {
      invalidates: "detail-training",
      successMessage: "Capacitación eliminada",
      errorMessage: "Error al eliminar la capacitación",
    },
  });

  const openForm = (item: DetailTraining | null) => {
    setEditTarget(item);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const submitForm = (data: TrainingFormValues) => {
    const payload = toPayload(data, editTarget);
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  };

  const confirmDelete = async (item: DetailTraining) => {
    if (await confirm({ title: `¿Eliminar "${item.topic}"?` }))
      deleteMut.mutate(item.id);
  };

  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay capacitaciones registradas";

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
              ? `Capacitación · ${currentService.name}`
              : "Detalles de capacitación"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {serviceId
              ? "Talleres y sesiones de este servicio de capacitación"
              : "Gestiona talleres y cursos de formación"}
          </p>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus size={14} /> Nueva capacitación
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por tema o descripción"
          label="Buscar capacitaciones"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando capacitaciones…" />
        ) : (
          <TrainingList
            items={items}
            view={view}
            emptyText={emptyText}
            renderActions={(item) => (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openForm(item)}
                >
                  <Pencil size={12} /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger-soft"
                  loading={
                    deleteMut.isPending && deleteMut.variables === item.id
                  }
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

      <TrainingFormModal
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
