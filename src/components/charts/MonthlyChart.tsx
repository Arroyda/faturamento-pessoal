import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, monthLabel } from "@/lib/utils";

interface Props {
  data: { month: string; income: number; expense: number; net: number }[];
}

export default function MonthlyChart({ data }: Props) {
  const mapped = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <div className="card h-80">
      <p className="mb-3 text-sm font-semibold text-slate-900">Fluxo mensal</p>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={mapped} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
          <Legend />
          <Area type="monotone" name="Receitas" dataKey="income" stroke="#10b981" fill="url(#cIncome)" strokeWidth={2} />
          <Area type="monotone" name="Despesas" dataKey="expense" stroke="#ef4444" fill="url(#cExpense)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
