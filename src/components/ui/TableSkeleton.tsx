interface Props {
  rows?: number;
  label: string;
}

// Filas fantasma con la silueta de una tabla mientras llegan los datos.
export default function TableSkeleton({ rows = 5, label }: Props) {
  return (
    <div role="status" aria-live="polite" className="divide-y divide-line">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 px-5 py-4"
          aria-hidden="true"
        >
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}
