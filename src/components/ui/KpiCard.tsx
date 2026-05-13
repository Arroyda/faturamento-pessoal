import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  secondary?: string;
  isCurrency?: boolean;
  isPercent?: boolean;
  trend?: number;
  icon?: React.ReactNode;
  accent?: "default" | "emerald" | "rose" | "amber" | "brand";
}

export default function KpiCard({ label, value, secondary, isCurrency = true, isPercent = false, trend, icon, accent = "default" }: KpiCardProps) {
  const accents = {
    default: "bg-slate-50 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-brand-50 text-brand-700",
  };
  const formatted = isPercent ? formatPercent(value) : isCurrency ? formatCurrency(value) : value.toLocaleString("pt-BR");

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", accents[accent])}>{icon}</div>}
      </div>
      <p className="text-2xl font-semibold text-slate-900">{formatted}</p>
      {secondary && <p className="text-xs text-slate-500">{secondary}</p>}
      {trend !== undefined && (
        <p className={cn("text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
          {trend >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(trend))}
        </p>
      )}
    </div>
  );
}
