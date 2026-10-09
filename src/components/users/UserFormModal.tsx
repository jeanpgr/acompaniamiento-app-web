import { useId, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@/api/users";
import type { Role } from "@/api/roles";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import FormField from "@/components/ui/FormField";
import { ID_PHONE_MAX_DIGITS, onlyDigits, sanitized } from "@/lib/digits";
import PhotoPicker from "./PhotoPicker";
import {
  createSchema,
  editSchema,
  formValues,
  initialsOf,
  validatePhoto,
  type CreateFormData,
} from "./userForm";

interface Props {
  open: boolean;
  /** Usuario a editar; null para crear uno nuevo. */
  user: User | null;
  roles: Role[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFormData, photo: File | null) => void;
}

/**
 * Modal de alta/edición de usuario. El formulario arranca con los datos del
 * usuario: el padre le cambia la `key` en cada apertura para empezar limpio
 * (https://react.dev/learn/preserving-and-resetting-state).
 */
export default function UserFormModal({
  open,
  user,
  roles,
  pending,
  onClose,
  onSubmit,
}: Props) {
  const formId = useId();
  const isEdit = user !== null;
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({
    defaultValues: formValues(user),
    resolver: zodResolver(
      isEdit ? editSchema : createSchema,
    ) as unknown as Resolver<CreateFormData>,
  });

  const pickPhoto = (file: File) => {
    const err = validatePhoto(file);
    setPhotoError(err);
    setPhotoFile(err ? null : file);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoError(null);
  };

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      title={isEdit ? "Editar usuario" : "Nuevo usuario"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-3"
        onSubmit={handleSubmit((data) => onSubmit(data, photoFile))}
      >
        <PhotoPicker
          file={photoFile}
          currentUrl={user?.image ?? null}
          initials={user ? initialsOf(user.name, user.lastname) : ""}
          error={photoError}
          disabled={pending}
          onPick={pickPhoto}
          onClear={clearPhoto}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            htmlFor="users-name"
            label="Nombre"
            required
            error={errors.name?.message}
          >
            <input
              id="users-name"
              className="field"
              aria-invalid={!!errors.name}
              placeholder="Nombre"
              {...register("name")}
            />
          </FormField>
          <FormField
            htmlFor="users-lastname"
            label="Apellido"
            required
            error={errors.lastname?.message}
          >
            <input
              id="users-lastname"
              className="field"
              aria-invalid={!!errors.lastname}
              placeholder="Apellido"
              {...register("lastname")}
            />
          </FormField>
        </div>

        <FormField
          htmlFor="users-email"
          label="Correo electrónico"
          required
          error={errors.email?.message}
        >
          <input
            id="users-email"
            type="email"
            className="field"
            aria-invalid={!!errors.email}
            placeholder="correo@ejemplo.com"
            {...register("email")}
          />
        </FormField>

        {/* Contraseña: solo al crear */}
        {!isEdit && (
          <FormField
            htmlFor="users-password"
            label="Contraseña"
            required
            error={errors.password?.message}
          >
            <input
              id="users-password"
              type="password"
              className="field"
              aria-invalid={!!errors.password}
              placeholder="Mínimo 8 caracteres"
              {...register("password")}
            />
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField htmlFor="users-id_role" label="Rol">
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
          </FormField>
          <FormField
            htmlFor="users-cedula"
            label="Cédula"
            required={!isEdit}
            error={errors.cedula?.message}
          >
            <input
              id="users-cedula"
              className="field"
              aria-invalid={!!errors.cedula}
              placeholder="Cédula"
              inputMode="numeric"
              autoComplete="off"
              maxLength={ID_PHONE_MAX_DIGITS}
              {...sanitized(register("cedula"), onlyDigits)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            htmlFor="users-phone"
            label="Teléfono"
            required={!isEdit}
            error={errors.phone?.message}
          >
            <input
              id="users-phone"
              className="field"
              type="tel"
              aria-invalid={!!errors.phone}
              placeholder="Teléfono"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={ID_PHONE_MAX_DIGITS}
              {...sanitized(register("phone"), onlyDigits)}
            />
          </FormField>
          <FormField
            htmlFor="users-address"
            label="Dirección"
            required={!isEdit}
            error={errors.address?.message}
          >
            <input
              id="users-address"
              className="field"
              aria-invalid={!!errors.address}
              placeholder="Dirección"
              {...register("address")}
            />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
