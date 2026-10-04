import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Pencil, Trash2, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  getRolesPage,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  type CreateRoleInput,
} from "@/api/roles";
import { getErrorMessage } from "@/api/client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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

// Deben coincidir con los módulos de `authorizePermission("<módulo>")` en el backend.
const ALL_PERMISSIONS = [
  "users",
  "roles",
  "services",
  "vehicles",
  "schedule-acompan",
  "detail-tourism",
  "schedule-tourism",
  "detail-training",
  "schedule-training",
  "detail-daycare",
  "schedule-daycare",
  "products",
  "categories",
  "coupons",
  "sales",
  "sales-detail",
  "customer-reviews",
  "frequently-questions",
  "settings",
];

const PERM_LABELS: Record<string, string> = {
  users: "Gestión de usuarios",
  roles: "Gestión de roles",
  services: "Gestión servicios",
  vehicles: "Gestión vehículos",
  "schedule-acompan": "Acompañamiento",
  "detail-tourism": "Turismo (detalles)",
  "schedule-tourism": "Turismo (agendas)",
  "detail-training": "Capacitación (detalles)",
  "schedule-training": "Capacitación (agendas)",
  "detail-daycare": "Guardería (detalles)",
  "schedule-daycare": "Guardería (agendas)",
  products: "Productos",
  categories: "Categorías",
  coupons: "Cupones de descuento",
  sales: "Ventas",
  "sales-detail": "Detalle de ventas",
  "customer-reviews": "Reseñas de clientes",
  "frequently-questions": "Preguntas frecuentes",
  settings: "Configuración del sistema",
};

function usersLabel(n: number) {
  return n === 1 ? "1 persona" : `${n} personas`;
}

export default function RolesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  // Se guarda el id (no el objeto) para que el panel refleje los datos
  // actualizados después de cada refetch.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  // Búsqueda y estado se filtran en el servidor (paginación por cursor).
  const active = filter === "all" ? undefined : filter === "active";
  const pager = useCursorPagination(
    ["roles", { active, search: debouncedSearch }],
    (cursor) => getRolesPage(cursor, { active, search: debouncedSearch }),
  );
  const { items: filtered, isLoading, counts } = pager;

  const createMut = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setModalOpen(false);
      toast.success("Rol creado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al crear el rol")),
  });
  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateRoleInput>;
    }) => updateRole(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setModalOpen(false);
      toast.success("Rol actualizado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al actualizar el rol")),
  });
  const deleteMut = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Rol eliminado");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al eliminar el rol")),
  });

  const onDelete = async (role: Role) => {
    const count = role.users_count ?? 0;
    if (count > 0) {
      toast.error(
        `No se puede eliminar "${role.name}": tiene ${usersLabel(count)} asignada(s). Reasígnalas primero.`,
      );
      return;
    }
    if (
      await confirm({
        title: `¿Eliminar el rol ${role.name}?`,
        message: "Esta acción no se puede deshacer.",
        confirmLabel: "Eliminar",
      })
    ) {
      deleteMut.mutate(role.id);
    }
  };

  const { register, handleSubmit, reset, setValue, control } =
    useForm<CreateRoleInput>();
  const watchedPerms =
    useWatch({ control, name: "permissions", defaultValue: {} }) ?? {};

  const openCreate = () => {
    setEditTarget(null);
    reset({ name: "", description: "", permissions: {} });
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditTarget(role);
    reset({
      name: role.name ?? "",
      description: role.description ?? "",
      permissions: (role.permissions as Record<string, boolean>) ?? {},
    });
    setModalOpen(true);
  };

  const onSubmit = (data: CreateRoleInput) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data });
    } else {
      createMut.mutate(data);
    }
  };

  // El panel lateral muestra los permisos del rol seleccionado (clic en la
  // fila o en el selector); por defecto, el primero de la lista filtrada.
  const displayRole = filtered.find((r) => r.id === selectedId) ?? filtered[0];
  const [view, setView] = useViewMode();
  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay roles disponibles";

  const renderActions = (role: Role) => (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={(e) => {
          e.stopPropagation();
          openEdit(role);
        }}
      >
        <Pencil size={12} /> Editar
      </Button>
      <Button
        size="sm"
        variant="danger-soft"
        loading={deleteMut.isPending && deleteMut.variables === role.id}
        aria-label={`Eliminar rol ${role.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(role);
        }}
      >
        <Trash2 size={12} />
      </Button>
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Roles y permisos</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Configura los roles del sistema y sus permisos de acceso
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={14} /> Nuevo rol
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o descripción"
          label="Buscar roles"
        />
        <span className="text-xs text-ink-3 bg-line rounded-full px-3 py-1">
          {(counts?.active ?? 0) + (counts?.inactive ?? 0)} roles
        </span>
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2"
            }`}
            aria-pressed={filter === f}
          >
            {f === "all" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
          </button>
        ))}
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* En pantallas angostas el panel de permisos pasa debajo del listado */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Table */}
        <div className="flex-1 bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
          {isLoading ? (
            <TableSkeleton label="Cargando roles…" />
          ) : view === "grid" ? (
            <CardGrid empty={filtered.length === 0 && emptyText}>
              {filtered.map((role) => (
                <GridCard
                  key={role.id}
                  selected={role.id === displayRole?.id}
                  onClick={() => setSelectedId(role.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-medium text-ink text-sm">
                      {role.name}
                    </h2>
                    <Badge variant={role.active ? "success" : "default"}>
                      {role.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-3 line-clamp-3">
                    {role.description ?? "Sin descripción"}
                  </p>
                  <CardFields>
                    <CardField label="Usuarios">
                      <span className="text-xs bg-info-bg text-info-fg px-2 py-0.5 rounded-full">
                        {usersLabel(role.users_count ?? 0)}
                      </span>
                    </CardField>
                  </CardFields>
                  <CardActions>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-pressed={role.id === displayRole?.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(role.id);
                      }}
                    >
                      <Shield size={12} /> Permisos
                    </Button>
                    {renderActions(role)}
                  </CardActions>
                </GridCard>
              ))}
            </CardGrid>
          ) : (
            <table className="w-full min-w-160">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                    Rol
                  </th>
                  <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                    Descripción
                  </th>
                  <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                    Usuarios
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
                {filtered.map((role) => (
                  <tr
                    key={role.id}
                    className={`border-b border-line/70 cursor-pointer ${
                      role.id === displayRole?.id
                        ? "bg-info-bg"
                        : "hover:bg-surface-2"
                    }`}
                    onClick={() => setSelectedId(role.id)}
                    aria-selected={role.id === displayRole?.id}
                    title="Ver permisos de este rol"
                  >
                    <td className="px-5 py-3.5 font-medium text-ink text-sm">
                      {role.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-3">
                      {role.description ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-info-bg text-info-fg px-2 py-0.5 rounded-full">
                        {usersLabel(role.users_count ?? 0)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={role.active ? "success" : "default"}>
                        {role.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">{renderActions(role)}</div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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

        {/* Permissions panel */}
        {displayRole && (
          <div className="w-full lg:w-64 shrink-0 bg-surface rounded-xl p-5 shadow-sm border border-line h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={15} className="text-warning-fg" />
              <h3 className="font-semibold text-ink text-sm">
                Permisos · {displayRole.name}
              </h3>
            </div>
            <p className="text-xs text-ink-3 mb-3">
              Módulos a los que puede acceder este rol. Haz clic en otro rol
              para ver sus permisos.
            </p>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map((p) => {
                const has = !!(
                  displayRole.permissions as Record<string, boolean> | null
                )?.[p];
                return (
                  <div key={p} className="flex items-center gap-2 text-sm">
                    <span
                      className={`text-xs ${has ? "text-success-fg" : "text-ink-3"}`}
                    >
                      {has ? "✓" : "✗"}
                    </span>
                    <span className={has ? "text-ink" : "text-ink-3"}>
                      {PERM_LABELS[p]}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-ink-3 mb-2">Selector de rol</p>
              <select
                className="field"
                value={displayRole.id}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {filtered.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Editar rol" : "Nuevo rol"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={createMut.isPending || updateMut.isPending}
              onClick={handleSubmit(onSubmit)}
            >
              {editTarget ? "Guardar cambios" : "Crear rol"}
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div>
            <label
              htmlFor="roles-name"
              className="block text-sm font-medium text-ink mb-1"
            >
              Nombre
            </label>
            <input
              id="roles-name"
              className="field"
              {...register("name", { required: true })}
            />
          </div>
          <div>
            <label
              htmlFor="roles-description"
              className="block text-sm font-medium text-ink mb-1"
            >
              Descripción
            </label>
            <input
              id="roles-description"
              className="field"
              {...register("description")}
            />
          </div>
          <div>
            <p
              id="roles-permisos"
              className="block text-sm font-medium text-ink mb-2"
            >
              Permisos
            </p>
            <div
              role="group"
              aria-labelledby="roles-permisos"
              className="space-y-1.5 max-h-48 overflow-y-auto"
            >
              {ALL_PERMISSIONS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!watchedPerms[p]}
                    onChange={(e) => {
                      setValue("permissions", {
                        ...watchedPerms,
                        [p]: e.target.checked,
                      });
                    }}
                    className="rounded accent-primary w-4 h-4"
                  />
                  <span className="text-ink">{PERM_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
