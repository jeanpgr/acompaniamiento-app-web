import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "@/hooks/useViewMode";
import RefreshButton from "./RefreshButton";

interface Props {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

const OPTIONS = [
  { value: "list", label: "Vista de lista", Icon: List },
  { value: "grid", label: "Vista de cuadrícula", Icon: LayoutGrid },
] as const;

// Selector lista / cuadrícula de los listados del panel, con el botón de
// actualizar datos a su lado.
export default function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="inline-flex shrink-0 items-center gap-2">
      <RefreshButton />
      <div
        role="group"
        aria-label="Tipo de vista"
        className="inline-flex shrink-0 rounded-full border border-line bg-surface-2 p-1 gap-0.5"
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={view === value}
            aria-label={label}
            title={label}
            className={`w-9 h-8 inline-flex items-center justify-center rounded-full transition-colors ${
              view === value
                ? "bg-primary text-white shadow-raised"
                : "text-ink-3 hover:text-ink hover:bg-surface"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
