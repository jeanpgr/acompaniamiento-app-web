import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { serviceTypeStyle } from "@/lib/serviceTypes";
import type { OriginalType, Unified } from "./schedules";

// Una sección por tipo de servicio, siempre en este orden.
const SECTIONS: { type: OriginalType; styleKey: string }[] = [
  { type: "acompan", styleKey: "ACOMPAÑAMIENTO" },
  { type: "tourism", styleKey: "TURISMO" },
  { type: "training", styleKey: "CAPACITACION" },
  { type: "daycare", styleKey: "GUARDERIA" },
];

interface Props {
  items: Unified[];
  /** Prefijo de los id de cada sección (único por panel). */
  idPrefix: string;
  /** Texto cuando no hay citas (y ya terminó de cargar). */
  emptyText: string;
  isLoading?: boolean;
  /** Número del distintivo de cada sección (por defecto, cuántas citas tiene). */
  countOf?: (items: Unified[]) => number;
  renderItem: (s: Unified) => ReactNode;
}

/**
 * Citas agrupadas por tipo de servicio en secciones desplegables: la lista
 * puede crecer sin alargar el scroll. Al entrar solo se abre la primera
 * sección con citas; después se respeta lo que abra o cierre el usuario.
 */
export default function ServiceSections({
  items,
  idPrefix,
  emptyText,
  isLoading,
  countOf = (list) => list.length,
  renderItem,
}: Props) {
  // null = el usuario aún no tocó ninguna sección (se usa la de por defecto).
  const [expanded, setExpanded] = useState<ReadonlySet<OriginalType> | null>(
    null,
  );

  const sections = SECTIONS.map((sec) => ({
    ...sec,
    items: items.filter((s) => s.originalType === sec.type),
  })).filter((sec) => sec.items.length > 0);

  const defaultOpen = sections[0]?.type;
  const isExpanded = (type: OriginalType) =>
    expanded ? expanded.has(type) : type === defaultOpen;

  const toggle = (type: OriginalType) =>
    setExpanded((prev) => {
      const next = new Set(prev ?? (defaultOpen ? [defaultOpen] : []));
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  if (sections.length === 0) {
    return isLoading ? null : (
      <p className="text-sm text-ink-3 text-center py-6">{emptyText}</p>
    );
  }

  return (
    <>
      {sections.map(({ type, styleKey, items: sectionItems }) => {
        const st = serviceTypeStyle(styleKey);
        const open = isExpanded(type);
        const bodyId = `${idPrefix}-${type}`;
        return (
          <section key={type} className="border-b border-line last:border-b-0">
            <h3>
              <button
                type="button"
                onClick={() => toggle(type)}
                aria-expanded={open}
                aria-controls={bodyId}
                className="w-full flex items-center gap-2.5 px-5 min-h-12 text-left hover:bg-primary-soft/50 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`}
                />
                <span className="flex-1 text-sm font-semibold text-ink">
                  {st.label}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold tabular-nums ${st.badge}`}
                >
                  {countOf(sectionItems)}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`text-ink-3 transition-transform motion-reduce:transition-none ${open ? "" : "-rotate-90"}`}
                />
              </button>
            </h3>
            {open && (
              <div id={bodyId} className="px-3 pb-3 space-y-3">
                {sectionItems.map((s) => (
                  <Fragment key={`${s.originalType}-${s.id}`}>
                    {renderItem(s)}
                  </Fragment>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
