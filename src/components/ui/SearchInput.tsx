import { useRef } from "react";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Nombre accesible del campo (p. ej. "Buscar productos"). */
  label: string;
  className?: string;
}

// Búsqueda por palabra clave de las tablas del panel. El botón X (o Escape)
// limpia el texto y devuelve el foco al campo. El debounce y el filtrado los
// hace la página (ver useDebouncedValue + useCursorPagination).
export default function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className = "w-64",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div role="search" className={`relative ${className}`}>
      <Search
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            clear();
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="w-full pl-8 pr-8 py-1.5 text-sm border border-line rounded-lg bg-surface [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
