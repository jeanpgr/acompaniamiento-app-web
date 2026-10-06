import { useState, type ReactNode } from "react";
import { Clock, Video } from "lucide-react";
import type { DetailTraining } from "@/api/details-training";
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
  type Column,
} from "@/components/ui/DataTable";
import type { ViewMode } from "@/hooks/useViewMode";
import { formatDateTime, formatDuration } from "./trainingForm";

interface Props {
  items: DetailTraining[];
  view: ViewMode;
  emptyText: string;
  renderActions: (item: DetailTraining) => ReactNode;
}

const withIcon = (icon: ReactNode, text: string) => (
  <div className="flex items-center gap-1">
    {icon} {text}
  </div>
);

const COLUMNS: Column[] = [
  "Tema",
  "Fecha y hora",
  { label: withIcon(<Clock size={12} />, "Duración") },
  "Precio",
  { label: withIcon(<Video size={12} />, "Enlace") },
  "Acciones",
];

function Price({ item }: { item: DetailTraining }) {
  return item.price != null ? (
    <span className="font-medium text-ink">
      ${Number(item.price).toFixed(2)}
    </span>
  ) : (
    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-success-bg text-success-fg font-medium">
      Gratuito
    </span>
  );
}

function MeetLink({ item }: { item: DetailTraining }) {
  return item.link_meet ? (
    <a
      href={item.link_meet}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-info-fg hover:underline truncate max-w-36 block"
    >
      {item.link_meet}
    </a>
  ) : (
    <EmptyCell />
  );
}

/** Ya empezó: la app móvil no la muestra. */
function PastTag({ item, now }: { item: DetailTraining; now: number }) {
  if (new Date(item.date_time).getTime() > now) return null;
  return (
    <span className="ml-2 inline-block text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-ink-3 font-medium">
      Finalizada
    </span>
  );
}

/** Capacitaciones en tabla o tarjetas. */
export default function TrainingList({
  items,
  view,
  emptyText,
  renderActions,
}: Props) {
  // Hora de referencia fija por montaje (render puro).
  const [now] = useState(Date.now);

  if (view === "grid") {
    return (
      <CardGrid empty={items.length === 0 && emptyText}>
        {items.map((item) => (
          <GridCard key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium text-ink text-sm">
                {item.topic}
                <PastTag item={item} now={now} />
              </h2>
              <Price item={item} />
            </div>
            {item.description && (
              <p className="text-sm text-ink-3 line-clamp-3">
                {item.description}
              </p>
            )}
            <CardFields>
              <CardField label="Fecha">
                {formatDateTime(item.date_time)}
              </CardField>
              <CardField label="Duración">
                {formatDuration(item.duration)}
              </CardField>
              <CardField label="Enlace">
                <MeetLink item={item} />
              </CardField>
            </CardFields>
            <CardActions>{renderActions(item)}</CardActions>
          </GridCard>
        ))}
      </CardGrid>
    );
  }

  return (
    <table className="w-full min-w-160">
      <TableHead columns={COLUMNS} />
      <tbody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <td className="px-5 py-3.5">
              <p className="font-medium text-ink text-sm">
                {item.topic}
                <PastTag item={item} now={now} />
              </p>
              {item.description && (
                <p className="text-xs text-ink-3 truncate max-w-52">
                  {item.description}
                </p>
              )}
            </td>
            <td className="px-5 py-3.5 text-sm text-ink-3">
              {formatDateTime(item.date_time)}
            </td>
            <td className="px-5 py-3.5 text-sm text-ink-2">
              {formatDuration(item.duration)}
            </td>
            <td className="px-5 py-3.5 text-sm">
              <Price item={item} />
            </td>
            <td className="px-5 py-3.5">
              <MeetLink item={item} />
            </td>
            <td className="px-5 py-3.5">
              <div className="flex gap-2">{renderActions(item)}</div>
            </td>
          </TableRow>
        ))}
        {items.length === 0 && (
          <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
        )}
      </tbody>
    </table>
  );
}
