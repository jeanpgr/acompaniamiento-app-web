import { SERVICE_TYPE_STYLE } from "@/lib/serviceTypes";

/** Leyenda de colores por tipo de servicio. */
export default function ServiceTypeLegend() {
  return (
    <div className="mt-3 bg-surface rounded-xl shadow-sm border border-line p-3">
      <p className="text-xs font-medium text-ink-3 mb-2">Tipos de servicio</p>
      <ul className="space-y-1.5">
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
