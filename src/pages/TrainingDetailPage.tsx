import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  getDetailsTrainingPage,
  createDetailTraining,
  updateDetailTraining,
  deleteDetailTraining,
  type DetailTraining,
  type CreateDetailTrainingInput,
} from "@/api/details-training";
import { getServices } from "@/api/services";
import { getSchedulesTraining } from "@/api/schedules";
import { LIVE_REFETCH_MS } from "@/lib/invalidate";
import Breadcrumb from "@/components/ui/Breadcrumb";
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

/** Botón a las inscripciones del taller, con cuántas esperan confirmar el pago. */
function EnrollmentsLink({
  trainingId,
  pending,
}: {
  trainingId: string;
  pending: number;
}) {
  return (
    <Link
      to={`${trainingId}/inscripciones`}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
        pending > 0
          ? "bg-warning-bg text-warning-fg hover:brightness-95"
          : "bg-surface border border-line text-ink-2 hover:bg-surface-2 hover:border-line-strong"
      }`}
      aria-label={
        pending > 0
          ? `Inscripciones: ${pending} por confirmar`
          : "Ver inscripciones de la capacitación"
      }
    >
      <Users size={12} aria-hidden="true" /> Inscripciones
      {pending > 0 && (
        <span className="min-w-5 h-5 px-1.5 rounded-full bg-warning-fg text-white text-[11px] font-semibold inline-flex items-center justify-center tabular-nums">
          {pending}
        </span>
      )}
    </Link>
  );
}

export default function TrainingDetailPage() {
  const confirm = useConfirm();
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

  // Inscripciones que esperan confirmar el pago, por taller (aviso en "Inscripciones").
  const { data: enrollments = [] } = useQuery({
    queryKey: ["schedules-training"],
    queryFn: getSchedulesTraining,
    refetchInterval: LIVE_REFETCH_MS,
  });
  const pendingByTraining = new Map<string, number>();
  for (const r of enrollments) {
    if (r.status && r.status !== "PENDIENTE") continue;
    pendingByTraining.set(
      r.id_detail_training,
      (pendingByTraining.get(r.id_detail_training) ?? 0) + 1,
    );
  }

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
          <Breadcrumb
            items={[
              { label: "Gestión servicios", to: "/services" },
              { label: currentService?.name ?? "Capacitación" },
            ]}
          />
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
                <EnrollmentsLink
                  trainingId={item.id}
                  pending={pendingByTraining.get(item.id) ?? 0}
                />
                <Button
                  size="icon"
                  aria-label={`Editar ${item.topic}`}
                  title="Editar"
                  variant="secondary"
                  onClick={() => openForm(item)}
                >
                  <Pencil size={14} aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  aria-label={`Eliminar ${item.topic}`}
                  title="Eliminar"
                  variant="danger-soft"
                  loading={
                    deleteMut.isPending && deleteMut.variables === item.id
                  }
                  onClick={() => confirmDelete(item)}
                >
                  <Trash2 size={14} aria-hidden="true" />
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
