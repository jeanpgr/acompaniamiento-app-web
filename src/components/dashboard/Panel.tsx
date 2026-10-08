import type { ReactNode } from "react";

/** Tarjeta del dashboard: título, subtítulo opcional y acción a la derecha. */
export default function Panel({
  title,
  subtitle,
  action,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`bg-surface rounded-xl shadow-[0_1px_2px_rgb(23_38_58/0.06)] border border-line p-5 min-w-0 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
