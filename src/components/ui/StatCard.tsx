import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  value: string | number
  label: string
  trend?: { value: string; up: boolean }
}

export default function StatCard({ icon: Icon, iconBg = '#EFF6FF', iconColor = '#3B82F6', value, label, trend }: Props) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-800">{value}</p>
          <p className="text-sm text-slate-500 mt-1">{label}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
              {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  )
}
