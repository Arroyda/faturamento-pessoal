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
    default: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  };
  const formatted = isPercent ? formatPercent(value) : isCurrency ? formatCurrency(value) : value.toLocaleString("pt-BR");

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", accents[accent])}>{icon}</div>}
      </div>
      <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatted}</p>
      {secondary && <p className="text-xs text-slate-500 dark:text-slate-400">{secondary}</p>}
      {trend !== undefined && (
        <p className={cn("text-xs font-medium", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {trend >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(trend))}
        </p>
      )}
    </div>
  );
}
