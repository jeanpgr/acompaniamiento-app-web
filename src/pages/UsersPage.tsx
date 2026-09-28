import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  CheckCircle,
  UserX,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/api/users";
import { getRoles } from "@/api/roles";
import { getErrorMessage } from "@/api/client";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/ui/TableSkeleton";

// ── Validation ─────────────────────────────────────────────────
const baseSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(50),
  lastname: z.string().min(2, "Mínimo 2 caracteres").max(50),
  email: z.string().email("Email inválido").max(100),
  id_role: z.string().uuid().optional().or(z.literal("")),
  cedula: z
    .string()
    .max(10, "Máximo 10 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(10).optional().or(z.literal("")),
  address: z.string().max(250).optional().or(z.literal("")),
});

// Al crear, la BD exige cédula, teléfono y dirección (columnas NOT NULL).
const createSchema = baseSchema.extend({
  password: z.string().min(8, "Mínimo 8 caracteres").max(128),
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,10}$/, "Entre 6 y 10 dígitos"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,10}$/, "Entre 7 y 10 dígitos"),
  address: z.string().trim().min(5, "La dirección es obligatoria").max(250),
});

const editSchema = baseSchema;

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

// ── Avatar ─────────────────────────────────────────────────────
// Tonos oscuros: las iniciales en blanco mantienen contraste AA en todos.
const COLORS = [
  "#1D4ED8",
  "#15803D",
  "#B45309",
  "#B91C1C",
  "#6D28D9",
  "#0E7490",
  "#C2410C",
  "#BE185D",
];

function Avatar({
  name,
  lastname,
  idx,
  image,
}: {
  name: string;
  lastname: string | null;
  idx: number;
  image?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const bg = COLORS[idx % COLORS.length];
  const initials = `${name[0] ?? ""}${(lastname ?? "")[0] ?? ""}`.toUpperCase();
  if (image && !imgError) {
    return (
      <img
        src={image}
        alt=""
        className="w-8 h-8 rounded-full object-cover shrink-0 bg-line"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

// ── Foto de perfil ─────────────────────────────────────────────
// Mismos límites que el backend (upload.middleware): JPG/PNG, máx 5 MB.
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const MAX_PHOTO_MB = 5;

function validatePhoto(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type))
    return "Solo se permiten imágenes JPG o PNG.";
  if (file.size > MAX_PHOTO_MB * 1024 * 1024)
    return `La imagen supera los ${MAX_PHOTO_MB} MB.`;
  return null;
}

function PhotoPicker({
  file,
  currentUrl,
  initials,
  error,
  disabled,
  onPick,
  onClear,
}: {
  file: File | null;
  currentUrl: string | null;
  initials: string;
  error: string | null;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // La URL temporal del archivo se libera al cambiarlo o al cerrar.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = preview ?? currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-line flex items-center justify-center shrink-0 ring-1 ring-line">
        {shown ? (
          <img
            src={shown}
            alt="Vista previa de la foto"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-ink-3" aria-hidden="true">
            {initials || "?"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink mb-1">Foto de perfil</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={12} /> {shown ? "Cambiar foto" : "Subir foto"}
          </Button>
          {file && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={onClear}
            >
              <X size={12} /> Descartar
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          tabIndex={-1}
          aria-label="Seleccionar foto de perfil"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            // Permite volver a elegir el mismo archivo tras descartarlo.
            e.target.value = "";
          }}
        />
        {error ? (
          <p className="text-danger-fg text-xs mt-1" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-xs text-ink-3 mt-1">
            Opcional · JPG o PNG, máx. {MAX_PHOTO_MB} MB
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────
function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") {
      out[k] = typeof v === "string" ? v.trim() : v;
    }
  }
  return out;
}

// ── Page ───────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });
  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]));

  const activeCount = users.filter((u) => u.active).length;
  const inactiveCount = users.filter((u) => !u.active).length;

  // ── Mutations ────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: ({
      data,
      photo,
    }: {
      data: CreateUserInput;
      photo: File | null;
    }) => createUser(data, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      // El conteo de usuarios por rol (página de roles) depende de esto.
      qc.invalidateQueries({ queryKey: ["roles"] });
      setModalOpen(false);
      toast.success("Usuario creado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al crear el usuario")),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
      photo,
    }: {
      id: string;
      data: EditFormData;
      photo: File | null;
    }) => updateUser(id, sanitize(data) as UpdateUserInput, photo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      // El conteo de usuarios por rol (página de roles) depende de esto.
      qc.invalidateQueries({ queryKey: ["roles"] });
      setModalOpen(false);
      toast.success("Usuario actualizado correctamente");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al actualizar el usuario")),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario desactivado");
    },
    onError: (err: unknown) =>
      toast.error(getErrorMessage(err, "Error al eliminar el usuario")),
  });

  // ── Form ─────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(
      editTarget ? editSchema : createSchema,
    ) as unknown as Resolver<CreateFormData>,
  });

  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoError(null);
  };

  const pickPhoto = (file: File) => {
    const err = validatePhoto(file);
    setPhotoError(err);
    setPhotoFile(err ? null : file);
  };

  const openCreate = () => {
    setEditTarget(null);
    resetPhoto();
    reset({
      name: "",
      lastname: "",
      email: "",
      password: "",
      id_role: "",
      cedula: "",
      phone: "",
      address: "",
    });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditTarget(u);
    resetPhoto();
    reset({
      name: u.name ?? "",
      lastname: u.lastname ?? "",
      email: u.email ?? "",
      id_role: u.id_role ?? "",
      cedula: u.cedula ?? "",
      phone: u.phone ?? "",
      address: u.address ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = (data: CreateFormData) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data, photo: photoFile });
    } else {
      createMut.mutate({
        data: sanitize(data) as unknown as CreateUserInput,
        photo: photoFile,
      });
    }
  };

  // ── Filter ───────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      `${u.name} ${u.lastname ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.active) ||
      (statusFilter === "inactive" && !u.active);
    return matchSearch && matchStatus;
  });

  const isPending = createMut.isPending || updateMut.isPending;

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
        <Button onClick={openCreate}>
          <UserPlus size={14} /> Agregar usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Users}
          tone="info"
          value={users.length}
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar personal..."
            className="pl-8 pr-3 py-1.5 text-sm border border-line rounded-lg bg-surface focus:outline-none w-48"
          />
        </div>
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              f === statusFilter
                ? "bg-primary text-white"
                : "bg-surface text-ink-2 ring-1 ring-inset ring-line hover:bg-surface-2"
            }`}
            aria-pressed={f === statusFilter}
          >
            {f === "all" ? "Todos" : f === "active" ? "Activo" : "Inactivo"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-line overflow-x-auto">
        {isLoading ? (
          <TableSkeleton label="Cargando usuarios…" />
        ) : (
          <table className="w-full min-w-160">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Nombre
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Rol
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Cédula
                </th>
                <th className="text-left text-xs font-medium text-ink-3 px-5 py-3">
                  Teléfono
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
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-b border-line/70 hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={u.name}
                        lastname={u.lastname}
                        idx={i}
                        image={u.image}
                      />
                      <div>
                        <p className="font-medium text-ink text-sm">
                          {u.name} {u.lastname}
                        </p>
                        <p className="text-xs text-ink-3">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.id_role ? (
                      <span className="text-xs bg-info-bg text-info-fg px-2 py-0.5 rounded-full">
                        {u.role_name ?? roleMap[u.id_role] ?? "Rol desconocido"}
                      </span>
                    ) : (
                      <span className="text-ink-3 text-xs italic">Sin rol</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {u.cedula ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-ink-3">
                    {u.phone ?? (
                      <span className="text-ink-3 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.active ? "success" : "default"}>
                      {u.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil size={12} /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-soft"
                        loading={
                          deleteMut.isPending && deleteMut.variables === u.id
                        }
                        onClick={async () => {
                          if (
                            await confirm({
                              title: `¿Desactivar a ${u.name} ${u.lastname ?? ""}?`,
                              message:
                                "El usuario quedará inactivo y no podrá acceder.",
                              confirmLabel: "Desactivar",
                            })
                          ) {
                            deleteMut.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-ink-3 text-sm"
                  >
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !isPending && setModalOpen(false)}
        title={editTarget ? "Editar usuario" : "Nuevo usuario"}
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
              {editTarget ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <PhotoPicker
            file={photoFile}
            currentUrl={editTarget?.image ?? null}
            initials={
              editTarget
                ? `${editTarget.name[0] ?? ""}${editTarget.lastname?.[0] ?? ""}`.toUpperCase()
                : ""
            }
            error={photoError}
            disabled={isPending}
            onPick={pickPhoto}
            onClear={resetPhoto}
          />

          {/* Name + Lastname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="users-name"
                className="block text-sm font-medium text-ink mb-1"
              >
                Nombre <span className="text-danger-fg">*</span>
              </label>
              <input
                id="users-name"
                className="field"
                aria-invalid={!!errors.name}
                placeholder="Nombre"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="users-lastname"
                className="block text-sm font-medium text-ink mb-1"
              >
                Apellido <span className="text-danger-fg">*</span>
              </label>
              <input
                id="users-lastname"
                className="field"
                aria-invalid={!!errors.lastname}
                placeholder="Apellido"
                {...register("lastname")}
              />
              {errors.lastname && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.lastname.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="users-email"
              className="block text-sm font-medium text-ink mb-1"
            >
              Correo electrónico <span className="text-danger-fg">*</span>
            </label>
            <input
              id="users-email"
              type="email"
              className="field"
              aria-invalid={!!errors.email}
              placeholder="correo@ejemplo.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-danger-fg text-xs mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password — solo en creación */}
          {!editTarget && (
            <div>
              <label
                htmlFor="users-password"
                className="block text-sm font-medium text-ink mb-1"
              >
                Contraseña <span className="text-danger-fg">*</span>
              </label>
              <input
                id="users-password"
                type="password"
                className="field"
                aria-invalid={!!errors.password}
                placeholder="Mínimo 8 caracteres"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}

          {/* Role + Cedula */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="users-id_role"
                className="block text-sm font-medium text-ink mb-1"
              >
                Rol
              </label>
              <select
                id="users-id_role"
                className="field"
                {...register("id_role")}
              >
                <option value="">Sin rol</option>
                {roles
                  .filter((r) => r.active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="users-cedula"
                className="block text-sm font-medium text-ink mb-1"
              >
                Cédula
                {!editTarget && <span className="text-danger-fg"> *</span>}
              </label>
              <input
                id="users-cedula"
                className="field"
                aria-invalid={!!errors.cedula}
                placeholder="Cédula"
                {...register("cedula")}
              />
              {errors.cedula && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.cedula.message}
                </p>
              )}
            </div>
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="users-phone"
                className="block text-sm font-medium text-ink mb-1"
              >
                Teléfono
                {!editTarget && <span className="text-danger-fg"> *</span>}
              </label>
              <input
                id="users-phone"
                className="field"
                aria-invalid={!!errors.phone}
                placeholder="Teléfono"
                inputMode="numeric"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="users-address"
                className="block text-sm font-medium text-ink mb-1"
              >
                Dirección
                {!editTarget && <span className="text-danger-fg"> *</span>}
              </label>
              <input
                id="users-address"
                className="field"
                aria-invalid={!!errors.address}
                placeholder="Dirección"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-danger-fg text-xs mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
