import { useRef, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Lock, Pencil, Save, Trash2 } from "lucide-react";
import {
  deleteMyPhoto,
  getMyProfile,
  updateMyProfile,
  uploadMyPhoto,
  type UpdateMyProfileInput,
  type User,
} from "@/api/users";
import { getStoredToken, getStoredUser, saveAuth } from "@/store/authStore";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ZoomableImage from "@/components/ui/ZoomableImage";
import MapPickButton from "@/components/ui/MapPickButton";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useDiscardGuard } from "@/hooks/useDiscardGuard";
import { ID_PHONE_MAX_DIGITS, onlyDigits, sanitized } from "@/lib/digits";
import {
  initialsOf,
  MAX_PHOTO_MB,
  validatePhoto,
} from "@/components/users/userForm";

// Mismas reglas que PUT /users/me (updateMyProfileSchema del backend).
const schema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50"),
  lastname: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{7,10}$/, "Entre 7 y 10 dígitos")
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .min(5, "Mínimo 5 caracteres")
    .max(250, "Máximo 250 caracteres")
    .or(z.literal("")),
  address_lat: z.number().nullable(),
  address_lng: z.number().nullable(),
});

type FormData = z.infer<typeof schema>;

const toForm = (u: User | null | undefined): FormData => ({
  name: u?.name ?? "",
  lastname: u?.lastname ?? "",
  phone: u?.phone ?? "",
  address: u?.address ?? "",
  address_lat: u?.address_lat ?? null,
  address_lng: u?.address_lng ?? null,
});

/** La sesión guardada muestra el nombre en el menú y el saludo. */
function syncStoredName(u: Pick<User, "name" | "lastname">) {
  const token = getStoredToken();
  const stored = getStoredUser();
  if (token && stored)
    saveAuth(token, { ...stored, name: u.name, lastname: u.lastname ?? "" });
}

const formatSince = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("es-EC", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

/** Un dato del perfil: etiqueta arriba y valor (o su campo al editar). */
function Item({
  label,
  edit,
  htmlFor,
  locked,
  error,
  wide,
  children,
}: {
  label: string;
  /** Modo edición: etiqueta de formulario en lugar de término de lista. */
  edit: boolean;
  htmlFor?: string;
  /** No editable desde el perfil (se muestra con candado al editar). */
  locked?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const Term = edit ? (htmlFor ? "label" : "p") : "dt";
  const Desc = edit ? "div" : "dd";
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <Term
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 mb-1"
      >
        {label}
        {locked && <Lock size={12} aria-label="No editable" />}
      </Term>
      <Desc
        className={`text-[15px] wrap-break-word ${locked ? "text-ink-2" : "text-ink"}`}
      >
        {children}
      </Desc>
      {error && (
        <p className="text-danger-fg text-xs font-semibold mt-1">{error}</p>
      )}
    </div>
  );
}

const Empty = () => <span className="text-ink-3">Sin registrar</span>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Perfil del usuario con sesión: foto, datos y acciones. "Editar
 * información" convierte en campos los datos que el usuario puede cambiar
 * (nombre, apellido, teléfono, dirección) sin salir del modal. La
 * contraseña y el cierre de sesión están en el menú del usuario (UserMenu).
 */
export default function ProfileModal({ open, onClose }: Props) {
  // Cada apertura empieza en modo lectura.
  const [openCount, setOpenCount] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenCount((n) => n + 1);
  }
  return <ProfileContent key={openCount} open={open} onClose={onClose} />;
}

function ProfileContent({ open, onClose }: Props) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const profile = useQuery({
    queryKey: ["users", "me"],
    queryFn: getMyProfile,
    enabled: open,
  });
  const user = profile.data ?? null;
  const fallback = getStoredUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: toForm(user),
    // Si el perfil se refresca mientras se edita (p. ej. al cambiar la
    // foto), no se pisa lo que el usuario ya escribió.
    resetOptions: { keepDirtyValues: true },
  });
  const [address, lat, lng] = useWatch({
    control,
    name: ["address", "address_lat", "address_lng"],
  });

  const save = useMutation({
    mutationFn: (d: FormData) => {
      const body: UpdateMyProfileInput = {
        name: d.name.trim(),
        lastname: d.lastname.trim(),
      };
      // Vacíos no se envían: el backend no permite borrarlos.
      if (d.phone) body.phone = d.phone;
      if (d.address) {
        body.address = d.address.trim();
        body.address_lat = d.address_lat;
        body.address_lng = d.address_lng;
      }
      return updateMyProfile(body);
    },
    meta: {
      invalidates: "users",
      successMessage: "Perfil actualizado",
      errorMessage: "No se pudo actualizar el perfil",
    },
    onSuccess: (u, sent) => {
      syncStoredName(
        u?.name ? u : { name: sent.name, lastname: sent.lastname },
      );
      setEditing(false);
    },
  });

  const upload = useMutation({
    mutationFn: uploadMyPhoto,
    meta: {
      invalidates: "users",
      successMessage: "Foto de perfil actualizada",
      errorMessage: "No se pudo subir la foto",
    },
  });
  const removePhoto = useMutation({
    mutationFn: deleteMyPhoto,
    meta: {
      invalidates: "users",
      successMessage: "Foto de perfil eliminada",
      errorMessage: "No se pudo quitar la foto",
    },
  });
  const photoBusy = upload.isPending || removePhoto.isPending;

  const pickPhoto = (file: File) => {
    const err = validatePhoto(file);
    setPhotoError(err);
    if (!err) upload.mutate(file);
  };

  const askRemovePhoto = async () => {
    if (
      await confirm({
        title: "¿Quitar tu foto de perfil?",
        message: "Se mostrarán tus iniciales en su lugar.",
        confirmLabel: "Quitar foto",
      })
    )
      removePhoto.mutate();
  };

  const cancelEdit = () => {
    reset(toForm(user));
    setEditing(false);
  };
  // Con cambios sin guardar, Cancelar o cerrar el modal piden confirmación.
  const requestCancelEdit = useDiscardGuard(isDirty, cancelEdit);
  const requestClose = useDiscardGuard(editing && isDirty, onClose);

  const name = user?.name ?? fallback?.name ?? "";
  const lastname = user?.lastname ?? fallback?.lastname ?? "";
  const fullName = `${name} ${lastname}`.trim() || "Mi perfil";
  const role = user?.role_name ?? fallback?.role ?? null;
  const formId = "profile-form";
  const List = editing ? "div" : "dl";

  const footer = editing ? (
    <>
      <Button
        variant="secondary"
        onClick={requestCancelEdit}
        disabled={save.isPending}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={save.isPending}
        disabled={!isDirty}
      >
        <Save size={18} aria-hidden="true" /> Guardar cambios
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
      <Button onClick={() => setEditing(true)} disabled={!user}>
        <Pencil size={18} aria-hidden="true" /> Editar información
      </Button>
    </>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={() => !save.isPending && requestClose()}
        title="Mi perfil"
        size="lg"
        footer={footer}
      >
        {/* Cabecera: foto, nombre y rol */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 pb-5 mb-5 border-b border-line text-center sm:text-left">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-sage flex items-center justify-center ring-4 ring-primary-soft">
              {user?.image ? (
                <ZoomableImage
                  src={user.image}
                  alt={`Foto de ${fullName}`}
                  buttonClassName="w-full h-full rounded-full"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-3xl font-bold text-white"
                  aria-hidden="true"
                >
                  {initialsOf(name, lastname) || "?"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label={user?.image ? "Cambiar foto" : "Subir foto"}
              title={user?.image ? "Cambiar foto" : "Subir foto"}
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary text-white shadow-raised ring-4 ring-surface inline-flex items-center justify-center hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {photoBusy ? (
                <span
                  className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Camera size={18} aria-hidden="true" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              tabIndex={-1}
              aria-label="Seleccionar foto de perfil"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) pickPhoto(picked);
                e.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold text-ink wrap-break-word">
              {fullName}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
              {role && <Badge variant="info">{role}</Badge>}
              {user && (
                <Badge variant={user.active ? "success" : "default"}>
                  {user.active ? "Activo" : "Inactivo"}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
              >
                <Camera size={16} aria-hidden="true" />
                {user?.image ? "Cambiar foto" : "Subir foto"}
              </Button>
              {user?.image && (
                <Button
                  size="sm"
                  variant="danger-soft"
                  onClick={askRemovePhoto}
                  disabled={photoBusy}
                >
                  <Trash2 size={16} aria-hidden="true" /> Quitar foto
                </Button>
              )}
            </div>
            {photoError ? (
              <p
                className="text-danger-fg text-xs font-semibold mt-1"
                role="alert"
              >
                {photoError}
              </p>
            ) : (
              <p className="text-xs text-ink-3 mt-1">
                JPG o PNG, máx. {MAX_PHOTO_MB} MB
              </p>
            )}
          </div>
        </div>

        {profile.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
            <span className="sr-only">Cargando perfil…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-1.5" aria-hidden="true">
                <div className="skeleton h-3.5 w-20" />
                <div className="skeleton h-5 w-40" />
              </div>
            ))}
          </div>
        ) : profile.isError || !user ? (
          <div className="text-center py-6">
            <p className="text-[15px] text-ink-2 mb-3">
              No se pudo cargar tu perfil.
            </p>
            <Button variant="secondary" onClick={() => profile.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <form
            id={formId}
            noValidate
            onSubmit={handleSubmit((d) => save.mutate(d))}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-base font-bold text-ink">
                Información personal
              </h4>
              {editing && (
                <span className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded-full">
                  Editando
                </span>
              )}
            </div>
            <List className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Item
                edit={editing}
                label="Nombre"
                htmlFor={editing ? "profile-name" : undefined}
                error={editing ? errors.name?.message : undefined}
              >
                {editing ? (
                  <input
                    id="profile-name"
                    className="field"
                    autoComplete="given-name"
                    maxLength={50}
                    aria-invalid={!!errors.name}
                    autoFocus
                    {...register("name")}
                  />
                ) : (
                  user.name
                )}
              </Item>
              <Item
                edit={editing}
                label="Apellido"
                htmlFor={editing ? "profile-lastname" : undefined}
                error={editing ? errors.lastname?.message : undefined}
              >
                {editing ? (
                  <input
                    id="profile-lastname"
                    className="field"
                    autoComplete="family-name"
                    maxLength={50}
                    aria-invalid={!!errors.lastname}
                    {...register("lastname")}
                  />
                ) : (
                  user.lastname || <Empty />
                )}
              </Item>
              <Item edit={editing} label="Correo electrónico" locked={editing}>
                {user.email}
              </Item>
              <Item edit={editing} label="Cédula" locked={editing}>
                {user.cedula || <Empty />}
              </Item>
              <Item
                edit={editing}
                label="Teléfono"
                htmlFor={editing ? "profile-phone" : undefined}
                error={editing ? errors.phone?.message : undefined}
              >
                {editing ? (
                  <input
                    id="profile-phone"
                    className="field"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="0991234567"
                    maxLength={ID_PHONE_MAX_DIGITS}
                    aria-invalid={!!errors.phone}
                    {...sanitized(register("phone"), onlyDigits)}
                  />
                ) : (
                  user.phone || <Empty />
                )}
              </Item>
              <Item edit={editing} label="Usuario" locked={editing}>
                {user.username || <Empty />}
              </Item>
              <Item
                edit={editing}
                label="Dirección"
                htmlFor={editing ? "profile-address" : undefined}
                error={editing ? errors.address?.message : undefined}
                wide
              >
                {editing ? (
                  <div className="flex gap-2">
                    <input
                      id="profile-address"
                      className="field flex-1 min-w-0"
                      autoComplete="street-address"
                      maxLength={250}
                      placeholder="Calle, número y referencia"
                      aria-invalid={!!errors.address}
                      {...register("address", {
                        // Escrita a mano: el punto del mapa ya no corresponde.
                        onChange: () => {
                          setValue("address_lat", null);
                          setValue("address_lng", null);
                        },
                      })}
                    />
                    <MapPickButton
                      title="Tu dirección"
                      address={address ?? ""}
                      lat={lat}
                      lng={lng}
                      onPick={(p) => {
                        setValue("address", p.address, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        setValue("address_lat", p.lat, { shouldDirty: true });
                        setValue("address_lng", p.lng, { shouldDirty: true });
                      }}
                    />
                  </div>
                ) : (
                  user.address || <Empty />
                )}
              </Item>
              <Item edit={editing} label="Rol" locked={editing}>
                {role ?? <Empty />}
              </Item>
              <Item edit={editing} label="Miembro desde" locked={editing}>
                {formatSince(user.createdAt) ?? <Empty />}
              </Item>
            </List>
            {editing && (
              <p className="flex items-center gap-1.5 text-xs text-ink-3 mt-4">
                <Lock size={12} aria-hidden="true" /> Correo, cédula, usuario y
                rol solo los cambia un administrador desde Usuarios.
              </p>
            )}
          </form>
        )}
      </Modal>
    </>
  );
}
