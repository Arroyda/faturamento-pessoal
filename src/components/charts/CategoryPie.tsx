import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface Props {
  title: string;
  data: { name: string; value: number; color?: string }[];
}

const PALETTE = ["#176ef5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#64748b", "#a855f7"];

export default function CategoryPie({ title, data }: Props) {
  return (
    <div className="card h-80">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color || PALETTE[idx % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
