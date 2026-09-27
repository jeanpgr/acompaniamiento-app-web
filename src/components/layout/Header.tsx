interface Props {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

// Cabecera de página compartida: título, contexto y acción principal.
export default function Header({ title, subtitle, action }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink text-balance">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
