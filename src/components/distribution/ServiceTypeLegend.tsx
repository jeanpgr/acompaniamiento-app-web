import { SERVICE_TYPE_STYLE } from "@/lib/serviceTypes";

/** Leyenda de colores por tipo de servicio, en una fila al pie del calendario. */
export default function ServiceTypeLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 bg-surface rounded-xl shadow-sm border border-line px-4 py-2.5">
      <p className="text-xs font-medium text-ink-3">Tipos de servicio</p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {Object.entries(SERVICE_TYPE_STYLE).map(([key, st]) => (
          <li key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`w-2.5 h-2.5 rounded-sm shrink-0 ${st.dot}`}
            />
            <span className="text-xs text-ink-2">{st.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
