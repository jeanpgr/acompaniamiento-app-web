import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import type { DetailTourism } from "@/api/details-tourism";
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
import {
  formatDate,
  formatDateRange,
  formatMoney,
  formatTripMeta,
} from "./tourismForm";

interface Props {
  items: DetailTourism[];
  view: ViewMode;
  emptyText: string;
  renderActions: (item: DetailTourism) => ReactNode;
}

const withIcon = (icon: ReactNode, text: string) => (
  <div className="flex items-center gap-1">
    {icon} {text}
  </div>
);

const COLUMNS: Column[] = [
  "Excursión",
  "Fechas",
  { label: withIcon(<Users size={12} />, "Cupos") },
  "Tarifas",
  { label: withIcon(<MapPin size={12} />, "Punto encuentro") },
  { label: withIcon(<Clock size={12} />, "Itinerario") },
  "Acciones",
];

/** Tarifas definidas, en el orden en que se muestran. */
function priceRows(prices: DetailTourism["prices"]) {
  return (
    [
      { label: "Adulto", value: prices?.adult },
      { label: "Niño", value: prices?.child },
      { label: "3ra edad", value: prices?.senior },
    ]
      // Puede llegar como texto ("20") si se guardó así.
      .filter((r) => r.value != null && String(r.value).trim() !== "")
      .map((r) => ({ label: r.label, value: Number(r.value) }))
      .filter((r) => !Number.isNaN(r.value))
  );
}

/**
 * Tarifas en dos líneas para la tabla: el precio más bajo destacado y el
 * desglose abreviado debajo (antes ocupaban una línea por categoría).
 */
function PricesCompact({ prices }: { prices: DetailTourism["prices"] }) {
  const rows = priceRows(prices);
  if (rows.length === 0) return <EmptyCell />;
  const min = Math.min(...rows.map((r) => r.value));
  const detail = rows
    .map((r) => `${r.label} ${formatMoney(r.value)}`)
    .join(" · ");
  return (
    <div className="whitespace-nowrap" title={detail}>
      <p className="text-sm font-medium text-ink">
        {rows.length > 1 && (
          <span className="text-xs font-normal text-ink-3">Desde </span>
        )}
        {formatMoney(min)}
      </p>
      <p className="text-xs text-ink-3">{detail}</p>
    </div>
  );
}

function Prices({ prices }: { prices: DetailTourism["prices"] }) {
  const rows = priceRows(prices);
  if (rows.length === 0) return <span className="text-ink-3 italic">—</span>;
  return (
    <div className="space-y-0.5">
      {rows.map((r) => (
        <div key={r.label}>
          <span className="text-ink-3">{r.label}:</span>{" "}
          <span className="font-medium">${r.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function Itinerary({
  stops,
}: {
  stops: NonNullable<DetailTourism["itinerary"]>;
}) {
  return (
    <>
      <p className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-3">
        Itinerario
      </p>
      <ol className="flex flex-col gap-0">
        {stops.map((stop, i) => (
          <li key={i} className="flex items-start gap-3">
            {/* Línea de tiempo */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full mt-1 shrink-0 bg-primary" />
              {i < stops.length - 1 && (
                <div
                  className="w-px flex-1 bg-line-strong my-1"
                  style={{ minHeight: 16 }}
                />
              )}
            </div>
            <div className="pb-3">
              {stop.hour && (
                <span className="text-xs font-semibold text-ink-2 mr-2">
                  {stop.hour}
                </span>
              )}
              <span className="text-xs text-ink">{stop.place}</span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Ya salió: la app móvil no la muestra. */
function DepartedTag({ item, now }: { item: DetailTourism; now: number }) {
  if (new Date(item.date_output).getTime() > now) return null;
  return (
    <span className="ml-2 inline-block text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-ink-3 font-medium">
      Finalizada
    </span>
  );
}

/** Excursiones en tabla o tarjetas, con el itinerario desplegable. */
export default function TourismList({
  items,
  view,
  emptyText,
  renderActions,
}: Props) {
  // Solo esta lista sabe qué itinerario está abierto.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Hora de referencia fija por montaje (render puro).
  const [now] = useState(Date.now);

  const toggle = (item: DetailTourism) => {
    const stops = item.itinerary?.length ?? 0;
    if (stops === 0) return <EmptyCell />;
    const isExpanded = expandedId === item.id;
    return (
      <button
        type="button"
        onClick={() => setExpandedId(isExpanded ? null : item.id)}
        aria-expanded={isExpanded}
        className="flex items-center gap-1 text-xs font-medium text-info-fg hover:text-info-fg transition-colors"
      >
        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {stops} parada{stops !== 1 ? "s" : ""}
      </button>
    );
  };

  const expandedStops = (item: DetailTourism) =>
    expandedId === item.id && item.itinerary?.length ? item.itinerary : null;

  if (view === "grid") {
    return (
      <CardGrid empty={items.length === 0 && emptyText}>
        {items.map((item) => {
          const stops = expandedStops(item);
          return (
            <GridCard key={item.id}>
              <h2 className="font-medium text-ink text-sm">
                {item.name}
                <DepartedTag item={item} now={now} />
              </h2>
              {item.description && (
                <p className="text-sm text-ink-3 line-clamp-3">
                  {item.description}
                </p>
              )}
              <CardFields>
                <CardField label="Salida">
                  {formatDate(item.date_output)}
                </CardField>
                <CardField label="Llegada">
                  {formatDate(item.date_arrival)}
                </CardField>
                <CardField label="Cupos">
                  <span className="font-medium">{item.quotas_available}</span>
                  <span className="text-ink-3"> / {item.quotas}</span>
                </CardField>
                <CardField label="Precios">
                  <Prices prices={item.prices} />
                </CardField>
                <CardField label="Punto de encuentro">
                  {item.meeting_point_address ?? "—"}
                </CardField>
                <CardField label="Itinerario">{toggle(item)}</CardField>
              </CardFields>
              {stops && (
                <div className="rounded-lg bg-surface-2 px-4 py-3">
                  <Itinerary stops={stops} />
                </div>
              )}
              <CardActions>{renderActions(item)}</CardActions>
            </GridCard>
          );
        })}
      </CardGrid>
    );
  }

  return (
    <table className="w-full min-w-160">
      <TableHead columns={COLUMNS} />
      <tbody>
        {items.map((item) => {
          const stops = expandedStops(item);
          return (
            <Fragment key={item.id}>
              <TableRow>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink text-sm">
                    {item.name}
                    <DepartedTag item={item} now={now} />
                  </p>
                  {item.description && (
                    <p className="text-xs text-ink-3 truncate max-w-52">
                      {item.description}
                    </p>
                  )}
                </td>
                <td
                  className="px-5 py-3.5 whitespace-nowrap"
                  title={`Salida: ${formatDate(item.date_output)} · Llegada: ${formatDate(item.date_arrival)}`}
                >
                  <p className="text-sm text-ink-2">
                    {formatDateRange(item.date_output, item.date_arrival)}
                  </p>
                  <p className="text-xs text-ink-3">
                    {formatTripMeta(item.date_output, item.date_arrival)}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-sm text-ink-2 whitespace-nowrap">
                  <span className="font-medium">{item.quotas_available}</span>
                  <span className="text-ink-3"> / {item.quotas}</span>
                </td>
                <td className="px-5 py-3.5">
                  <PricesCompact prices={item.prices} />
                </td>
                <td className="px-5 py-3.5 text-sm text-ink-3 max-w-40 truncate">
                  {item.meeting_point_address ?? <EmptyCell />}
                </td>
                <td className="px-5 py-3.5">{toggle(item)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">{renderActions(item)}</div>
                </td>
              </TableRow>
              {stops && (
                <tr className="bg-surface-2">
                  <td colSpan={COLUMNS.length} className="px-8 py-4">
                    <Itinerary stops={stops} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
        {items.length === 0 && (
          <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
        )}
      </tbody>
    </table>
  );
}
