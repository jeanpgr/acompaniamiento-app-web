import { Check } from "lucide-react";
import { PLAN_COLORS } from "@/lib/planColors";

interface Props {
  /** Color elegido ("#RRGGBB") o "" si no tiene. */
  value: string;
  onChange: (hex: string) => void;
  label: string;
}

/** Selector de color de una paleta cerrada, con opción "Sin color". */
export default function ColorSwatches({ value, onChange, label }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        onClick={() => onChange("")}
        className={`chip ${value === "" ? "" : "opacity-80"}`}
        aria-pressed={value === ""}
      >
        Sin color
      </button>
      {PLAN_COLORS.map((c) => {
        const selected = value === c.hex;
        return (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={`w-9 h-9 rounded-full flex items-center justify-center ring-offset-2 transition focus-visible:outline-2 focus-visible:outline-focus ${
              selected ? "ring-2 ring-ink" : "ring-1 ring-line"
            }`}
          >
            {selected && <Check size={18} className="text-white" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
