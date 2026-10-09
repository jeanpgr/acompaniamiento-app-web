import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Truck, AlertTriangle } from "lucide-react";
import {
  getVehiclesPage,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  type Vehicle,
  type CreateVehicleInput,
} from "@/api/vehicles";
import { getUsers, type User } from "@/api/users";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { useForm } from "react-hook-form";
import TableSkeleton from "@/components/ui/TableSkeleton";
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

const REVIEW_THRESHOLD = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

/** Solo los usuarios con este rol pueden conducir (el backend lo valida). */
const DRIVER_ROLE_NAME = "conductor";
const isDriver = (u: User) =>
  u.active && u.role_name?.trim().toLowerCase() === DRIVER_ROLE_NAME;

export default function VehiclesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const pager = useCursorPagination(
    ["vehicles", { search: debouncedSearch }],
    (cursor) => getVehiclesPage(cursor, { search: debouncedSearch }),
  );
  const { items: vehicles, isLoading, counts } = pager;
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const createMut = useMutation({
    mutationFn: createVehicle,
    meta: {
      invalidates: "vehicles",
      successMessage: "Vehículo creado",
      errorMessage: "Error al crear el vehículo",
    },
    onSuccess: () => setModalOpen(false),
  });
  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateVehicleInput>;
    }) => updateVehicle(id, data),
    meta: {
      invalidates: "vehicles",
      successMessage: "Vehículo actualizado",
      errorMessage: "Error al actualizar el vehículo",
    },
    onSuccess: () => setModalOpen(false),
  });
  const deleteMut = useMutation({
    mutationFn: deleteVehicle,
    meta: {
      invalidates: "vehicles",
      successMessage: "Vehículo eliminado",
      errorMessage: "Error al eliminar el vehículo",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateVehicleInput>();

  const openCreate = () => {
    setEditTarget(null);
    reset();
    setModalOpen(true);
  };
  const openEdit = (v: Vehicle) => {
    setEditTarget(v);
    reset({
      id_driver: v.id_driver,
      name: v.name,
      model: v.model,
      license_plate: v.license_plate,
      capacity: v.capacity ?? undefined,
    });
    setModalOpen(true);
  };
  const onSubmit = (data: CreateVehicleInput) => {
    if (editTarget) updateMut.mutate({ id: editTarget.id, data });
    else createMut.mutate(data);
  };

  const userMap = Object.fromEntries(
    users.map((u) => [u.id, `${u.name} ${u.lastname}`]),
  );

  // Opciones del selector: usuarios activos con rol Conductor. Al editar un
  // vehículo cuyo conductor actual no lo es, se muestra para poder
  // conservarlo, pero no se puede elegir a otro que no sea conductor.
  const drivers = users.filter(isDriver);
  const keptDriver =
    editTarget && !drivers.some((u) => u.id === editTarget.id_driver)
      ? users.find((u) => u.id === editTarget.id_driver)
      : undefined;

  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay vehículos registrados";

  const renderReview = (v: Vehicle) => {
    if (!v.next_review) return <span className="text-ink-3 text-sm">—</span>;
    const reviewSoon = new Date(v.next_review) <= REVIEW_THRESHOLD;
    return (
      <span
        className={`text-sm ${reviewSoon ? "text-warning-fg font-semibold" : "text-ink-3"}`}
      >
        {reviewSoon && <AlertTriangle size={14} className="inline mr-1" />}
        {new Date(v.next_review).toLocaleDateString("es-CO")}
      </span>
    );
  };

  const renderActions = (v: Vehicle) => (
    <>
      <Button
        size="icon"
        aria-label={`Editar ${v.name}`}
        title="Editar"
        variant="secondary"
        onClick={() => openEdit(v)}
      >
        <Pencil size={16} aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        variant="danger-soft"
        onClick={() => deleteMut.mutate(v.id)}
        aria-label={`Eliminar ${v.name}`}
        title="Eliminar"
      >
        <Trash2 size={16} aria-hidden="true" />
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Gestión de vehículos
          </h1>
          <p className="text-[15px] text-ink-3 mt-1">
            Administra la flota de vehículos y sus revisiones
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo vehículo
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={Truck}
          tone="info"
          value={pager.total}
          label="Total vehículos"
        />
        <StatCard
          icon={Truck}
          tone="success"
          value={counts?.active ?? 0}
          label="Activos"
        />
        <StatCard
          icon={AlertTriangle}
          tone="warning"
          value={counts?.review_due ?? 0}
          label="Revisión próxima"
        />
        <StatCard
          icon={Truck}
          tone="neutral"
          value={counts?.inactive ?? 0}
          label="Inactivos"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, modelo o placa"
          label="Buscar vehículos"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando vehículos…" />
        ) : view === "grid" ? (
          <CardGrid empty={vehicles.length === 0 && emptyText}>
            {vehicles.map((v) => (
              <GridCard key={v.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                      <Truck size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-ink text-base line-clamp-2 wrap-break-word">
                        {v.name}
                      </h2>
                      <p className="text-xs text-ink-3 truncate">{v.model}</p>
                    </div>
                  </div>
                  <Badge variant={v.active ? "success" : "default"}>
                    {v.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <CardFields>
                  <CardField label="Placa">
                    <span className="font-mono">{v.license_plate}</span>
                  </CardField>
                  <CardField label="Capacidad">
                    {v.capacity ?? "—"} personas
                  </CardField>
                  <CardField label="Conductor">
                    {userMap[v.id_driver] ?? "Sin asignar"}
                  </CardField>
                  <CardField label="Próx. revisión">
                    {renderReview(v)}
                  </CardField>
                </CardFields>
                <CardActions>{renderActions(v)}</CardActions>
              </GridCard>
            ))}
          </CardGrid>
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Vehículo
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Placa
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Capacidad
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Conductor
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Próx. revisión
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Estado
                </th>
                <th className="text-left text-[13px] font-semibold text-ink-2 px-4 py-3">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-line/70 transition-colors hover:bg-primary-soft/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                        <Truck size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-ink text-sm">{v.name}</p>
                        <p className="text-xs text-ink-3">{v.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm text-ink">
                      {v.license_plate}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-2">
                    {v.capacity ?? "—"} personas
                  </td>
                  <td className="px-4 py-3.5 text-sm text-ink-2">
                    {userMap[v.id_driver] ?? "Sin asignar"}
                  </td>
                  <td className="px-4 py-3.5">{renderReview(v)}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={v.active ? "success" : "default"}>
                      {v.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">{renderActions(v)}</div>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-ink-3 text-[15px]"
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
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Editar vehículo" : "Nuevo vehículo"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={createMut.isPending || updateMut.isPending}
              onClick={handleSubmit(onSubmit)}
            >
              {editTarget ? "Guardar cambios" : "Crear vehículo"}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label
              htmlFor="vehicles-name"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Nombre
            </label>
            <input
              id="vehicles-name"
              className="field"
              placeholder="Ej. Furgoneta 1"
              {...register("name", { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="vehicles-model"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Modelo
            </label>
            <input
              id="vehicles-model"
              className="field"
              placeholder="Ej. Hyundai H1 2022"
              {...register("model", { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="vehicles-license_plate"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Placa
            </label>
            <input
              id="vehicles-license_plate"
              className="field"
              placeholder="Ej. PBA-1234"
              {...register("license_plate", { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="vehicles-capacity"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Capacidad
            </label>
            <input
              id="vehicles-capacity"
              type="number"
              className="field"
              placeholder="Ej. 8 (pasajeros)"
              {...register("capacity", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label
              htmlFor="vehicles-id_driver"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Conductor
            </label>
            <select
              id="vehicles-id_driver"
              className="field"
              aria-invalid={!!errors.id_driver}
              aria-describedby="vehicles-id_driver-help"
              {...register("id_driver", {
                required: "Selecciona un conductor",
              })}
            >
              <option value="">Seleccionar conductor</option>
              {keptDriver && (
                <option value={keptDriver.id}>
                  {keptDriver.name} {keptDriver.lastname} (actual, sin rol
                  Conductor)
                </option>
              )}
              {drivers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.lastname}
                </option>
              ))}
            </select>
            {errors.id_driver && (
              <p className="text-danger-fg text-xs font-semibold mt-1">
                {errors.id_driver.message}
              </p>
            )}
            <p id="vehicles-id_driver-help" className="text-xs text-ink-3 mt-1">
              {drivers.length === 0 ? (
                <>
                  No hay usuarios con el rol Conductor. Asígnalo en{" "}
                  <Link to="/users" className="font-semibold text-primary hover:underline">
                    Usuarios y roles
                  </Link>
                  .
                </>
              ) : (
                "Solo aparecen usuarios activos con el rol Conductor."
              )}
            </p>
          </div>
          <div>
            <label
              htmlFor="vehicles-next_review"
              className="block text-sm font-semibold text-ink mb-1.5"
            >
              Próxima revisión
            </label>
            <input
              id="vehicles-next_review"
              type="date"
              className="field"
              {...register("next_review")}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
