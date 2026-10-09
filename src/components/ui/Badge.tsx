interface Props {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "default";
  className?: string;
}

const VARIANTS = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  default: "bg-surface-2 text-ink-2 ring-1 ring-inset ring-line",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: Props) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
