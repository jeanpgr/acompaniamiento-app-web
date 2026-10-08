import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  CheckCircle,
  UserX,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  getUsersPage,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/api/users";
import { getRoles } from "@/api/roles";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import SearchInput from "@/components/ui/SearchInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useViewMode } from "@/hooks/useViewMode";
import CursorPagination from "@/components/ui/CursorPagination";
import UsersList from "@/components/users/UsersList";
import UserFormModal from "@/components/users/UserFormModal";
import { sanitize, type CreateFormData } from "@/components/users/userForm";

type StatusFilter = "all" | "active" | "inactive";
const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Todos",
  active: "Activo",
  inactive: "Inactivo",
};

export default function UsersPage() {
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useViewMode();

  // Modal: `formKey` cambia en cada apertura para que el formulario empiece limpio.
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Búsqueda y estado se filtran en el servidor (paginación por cursor);
  // los conteos de las tarjetas respetan la búsqueda.
  const debouncedSearch = useDebouncedValue(search.trim());
  const active = statusFilter === "all" ? undefined : statusFilter === "active";
  const pager = useCursorPagination(
    ["users", { search: debouncedSearch, active }],
    (cursor) => getUsersPage(cursor, { search: debouncedSearch, active }),
  );
  const { items: users, isLoading, counts } = pager;
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));

  const activeCount = counts?.active ?? 0;
  const inactiveCount = counts?.inactive ?? 0;

  // ── Mutaciones (refresco y avisos: lib/queryClient) ──────────
  const createMut = useMutation({
    mutationFn: ({
      data,
      photo,
    }: {
      data: CreateUserInput;
      photo: File | null;
    }) => createUser(data, photo),
    meta: {
      // Incluye roles: su conteo de usuarios depende de esto.
      invalidates: "users",
      successMessage: "Usuario creado correctamente",
      errorMessage: "Error al crear el usuario",
    },
    onSuccess: () => setModalOpen(false),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
      photo,
    }: {
      id: string;
      data: UpdateUserInput;
      photo: File | null;
    }) => updateUser(id, data, photo),
    meta: {
      // Incluye roles: su conteo de usuarios depende de esto.
      invalidates: "users",
      successMessage: "Usuario actualizado correctamente",
      errorMessage: "Error al actualizar el usuario",
    },
    onSuccess: () => setModalOpen(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    meta: {
      invalidates: "users",
      successMessage: "Usuario desactivado",
      errorMessage: "Error al eliminar el usuario",
    },
  });

  const openForm = (user: User | null) => {
    setEditTarget(user);
    setFormKey((k) => k + 1);
    setModalOpen(true);
  };

  const submitForm = (data: CreateFormData, photo: File | null) => {
    if (editTarget) {
      updateMut.mutate({
        id: editTarget.id,
        data: sanitize(data) as UpdateUserInput,
        photo,
      });
    } else {
      createMut.mutate({
        data: sanitize(data) as unknown as CreateUserInput,
        photo,
      });
    }
  };

  const confirmDelete = async (u: User) => {
    const ok = await confirm({
      title: `¿Desactivar a ${u.name} ${u.lastname ?? ""}?`,
      message: "El usuario quedará inactivo y no podrá acceder.",
      confirmLabel: "Desactivar",
    });
    if (ok) deleteMut.mutate(u.id);
  };

  const emptyText = debouncedSearch
    ? `Sin resultados para "${debouncedSearch}"`
    : "No hay usuarios registrados";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Usuarios · Talento humano
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Gestiona el personal de la plataforma y los roles asignados
          </p>
        </div>
        <Button onClick={() => openForm(null)}>
          <UserPlus size={14} /> Agregar usuario
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Users}
          tone="info"
          value={activeCount + inactiveCount}
          label="Total usuarios"
        />
        <StatCard
          icon={CheckCircle}
          tone="success"
          value={activeCount}
          label="Activos"
        />
        <StatCard
          icon={UserX}
          tone="danger"
          value={inactiveCount}
          label="Inactivos"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, email, cédula o teléfono"
          label="Buscar usuarios"
          className="w-full sm:w-80"
        />
        {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatus(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              f === statusFilter
                ? "bg-primary text-white"
                : "bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2"
            }`}
            aria-pressed={f === statusFilter}
          >
            {STATUS_LABEL[f]}
          </button>
        ))}
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando usuarios…" />
        ) : (
          <UsersList
            users={users}
            view={view}
            emptyText={emptyText}
            renderRole={(u) =>
              u.id_role ? (
                <span className="text-xs bg-info-bg text-info-fg px-2 py-0.5 rounded-full">
                  {u.role_name ?? roleMap[u.id_role] ?? "Rol desconocido"}
                </span>
              ) : (
                <span className="text-ink-3 text-xs italic">Sin rol</span>
              )
            }
            renderActions={(u) => (
              <>
                <Button
                  size="icon"
                  aria-label={`Editar ${u.name}`}
                  title="Editar"
                  variant="secondary"
                  onClick={() => openForm(u)}
                >
                  <Pencil size={14} aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  aria-label={`Desactivar a ${u.name}`}
                  title="Desactivar"
                  variant="danger-soft"
                  loading={deleteMut.isPending && deleteMut.variables === u.id}
                  onClick={() => confirmDelete(u)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </>
            )}
          />
        )}
        {!isLoading && <CursorPagination pager={pager} />}
      </div>

      <UserFormModal
        key={formKey}
        open={modalOpen}
        user={editTarget}
        roles={roles}
        pending={createMut.isPending || updateMut.isPending}
        onClose={() => setModalOpen(false)}
        onSubmit={submitForm}
      />
    </div>
  );
}
