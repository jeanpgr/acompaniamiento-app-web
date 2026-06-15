import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export default function PlaceholderPage({
  icon: Icon,
  title,
  subtitle,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Icon size={28} style={{ color: "#1D3461" }} />
      </div>
      <h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2>
      <p className="text-slate-400 text-sm">{subtitle}</p>
    </div>
  );
}
