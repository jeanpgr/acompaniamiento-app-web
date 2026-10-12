import type { ReactNode } from "react";
import type { User } from "@/api/users";
import Badge from "@/components/ui/Badge";
import {
  CardGrid,
  GridCard,
  CardFields,
  CardField,
  CardActions,
} from "@/components/ui/CardGrid";
import {
  TableHead,
  TableRow,
  EmptyRow,
  EmptyCell,
} from "@/components/ui/DataTable";
import type { ViewMode } from "@/hooks/useViewMode";
import UserAvatar from "./UserAvatar";

interface Props {
  users: User[];
  view: ViewMode;
  emptyText: string;
  /** Etiqueta del rol del usuario. */
  renderRole: (user: User) => ReactNode;
  /** Botones de editar/eliminar. */
  renderActions: (user: User) => ReactNode;
}

const COLUMNS = ["Nombre", "Rol", "Cédula", "Teléfono", "Estado", "Acciones"];

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "default"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

/** Usuarios en tabla (pantallas anchas) o en tarjetas (grid). */
export default function UsersList({
  users,
  view,
  emptyText,
  renderRole,
  renderActions,
}: Props) {
  if (view === "grid") {
    return (
      <CardGrid empty={users.length === 0 && emptyText}>
        {users.map((u, i) => (
          <GridCard key={u.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar
                  name={u.name}
                  lastname={u.lastname}
                  idx={i}
                  image={u.image}
                />
                <div className="min-w-0">
                  <h2 className="font-bold text-ink text-base line-clamp-2 wrap-break-word">
                    {u.name} {u.lastname}
                  </h2>
                  <p className="text-xs text-ink-3 truncate">{u.email}</p>
                </div>
              </div>
              <StatusBadge active={u.active} />
            </div>
            <CardFields>
              <CardField label="Rol">{renderRole(u)}</CardField>
              <CardField label="Cédula">{u.cedula ?? "—"}</CardField>
              <CardField label="Teléfono">{u.phone ?? "—"}</CardField>
            </CardFields>
            <CardActions>{renderActions(u)}</CardActions>
          </GridCard>
        ))}
      </CardGrid>
    );
  }

  return (
    <table className="w-full min-w-160">
      <TableHead columns={COLUMNS} />
      <tbody>
        {users.map((u, i) => (
          <TableRow key={u.id}>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={u.name}
                  lastname={u.lastname}
                  idx={i}
                  image={u.image}
                />
                <div>
                  <p className="font-semibold text-ink text-sm">
                    {u.name} {u.lastname}
                  </p>
                  <p className="text-xs text-ink-3">{u.email}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3.5">{renderRole(u)}</td>
            <td className="px-4 py-3.5 text-sm text-ink-3">
              {u.cedula ?? <EmptyCell />}
            </td>
            <td className="px-4 py-3.5 text-sm text-ink-3">
              {u.phone ?? <EmptyCell />}
            </td>
            <td className="px-4 py-3.5">
              <StatusBadge active={u.active} />
            </td>
            <td className="px-4 py-3.5">
              <div className="flex gap-2">{renderActions(u)}</div>
            </td>
          </TableRow>
        ))}
        {users.length === 0 && (
          <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
        )}
      </tbody>
    </table>
  );
}
