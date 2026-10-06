import type { ReactNode } from "react";
import type { Product } from "@/api/products";
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
  type Column,
} from "@/components/ui/DataTable";
import type { ViewMode } from "@/hooks/useViewMode";
import ProductThumbnail from "./ProductThumbnail";
import { formatPrice, stockColor } from "./productForm";

interface Props {
  products: Product[];
  view: ViewMode;
  emptyText: string;
  categoryName: (id: string) => string;
  renderActions: (product: Product) => ReactNode;
}

const COLUMNS: Column[] = [
  { label: "Producto", className: "w-[40%]" },
  "Categoría",
  "Precio",
  "Stock",
  "Estado",
  "Acciones",
];

function Stock({ n }: { n: number }) {
  return (
    <span className={`text-sm font-semibold ${stockColor(n)}`}>
      {n}
      {n === 0 && <span className="ml-1 text-xs font-normal">(agotado)</span>}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "danger"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

/** Productos en tabla (pantallas anchas) o en tarjetas (grid). */
export default function ProductsList({
  products,
  view,
  emptyText,
  categoryName,
  renderActions,
}: Props) {
  if (view === "grid") {
    return (
      <CardGrid empty={products.length === 0 && emptyText}>
        {products.map((p) => (
          <GridCard key={p.id}>
            <ProductThumbnail
              photo={p.photo}
              name={p.name}
              className="w-full h-40"
              iconSize={28}
            />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium text-ink text-sm truncate">
                  {p.name}
                </h2>
                <p className="text-xs text-ink-3">
                  {categoryName(p.id_category)}
                </p>
              </div>
              <StatusBadge active={p.active} />
            </div>
            {p.description && (
              <p className="text-sm text-ink-3 line-clamp-2">{p.description}</p>
            )}
            <CardFields>
              <CardField label="Precio">
                <span className="font-medium">{formatPrice(p.price)}</span>
              </CardField>
              <CardField label="Stock">
                <Stock n={p.stock} />
              </CardField>
            </CardFields>
            <CardActions>{renderActions(p)}</CardActions>
          </GridCard>
        ))}
      </CardGrid>
    );
  }

  return (
    <table className="w-full min-w-160">
      <TableHead columns={COLUMNS} />
      <tbody>
        {products.map((p) => (
          <TableRow key={p.id}>
            <td className="px-5 py-3">
              <div className="flex items-center gap-3">
                <ProductThumbnail photo={p.photo} name={p.name} />
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm truncate">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="text-xs text-ink-3 truncate max-w-40">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-5 py-3 text-sm text-ink-3">
              {categoryName(p.id_category)}
            </td>
            <td className="px-5 py-3 text-sm font-medium text-ink">
              {formatPrice(p.price)}
            </td>
            <td className="px-5 py-3">
              <Stock n={p.stock} />
            </td>
            <td className="px-5 py-3">
              <StatusBadge active={p.active} />
            </td>
            <td className="px-5 py-3">
              <div className="flex gap-2">{renderActions(p)}</div>
            </td>
          </TableRow>
        ))}
        {products.length === 0 && (
          <EmptyRow colSpan={COLUMNS.length}>{emptyText}</EmptyRow>
        )}
      </tbody>
    </table>
  );
}
