import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  CircleDollarSign,
  PiggyBank,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import MonthlyChart from "@/components/charts/MonthlyChart";
import CategoryPie from "@/components/charts/CategoryPie";
import { useApiResource } from "@/hooks/useApi";
import { Category, DashboardSummary } from "@/types";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const { data, loading } = useApiResource<DashboardSummary>("/dashboard/summary?months=6");
  const { data: categories } = useApiResource<Category[]>("/categories");

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    (categories || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  if (loading || !data) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  const k = data.kpis;

  const expensePie = data.expense_by_category.slice(0, 8).map((e) => {
    const cat = categoryMap.get(e.category_id);
    return {
      name: cat?.name || "Sem categoria",
      value: e.total,
      color: cat?.color,
    };
  });

  const invPie = data.investments_by_type.map((i) => ({
    name: investmentLabel(i.type),
    value: i.value,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Patrimônio estimado"
          value={k.net_worth_estimate}
          icon={<PiggyBank className="h-4 w-4" />}
          accent="brand"
          secondary="Saldo + investimentos"
        />
        <KpiCard
          label="Saldo do mês"
          value={k.current_month_balance}
          accent={k.current_month_balance >= 0 ? "emerald" : "rose"}
          icon={<CircleDollarSign className="h-4 w-4" />}
          secondary={`Receitas ${formatCurrency(k.current_month_income)} • Despesas ${formatCurrency(k.current_month_expense)}`}
        />
        <KpiCard
          label="Taxa de poupança"
          value={k.saving_rate_pct}
          isCurrency={false}
          isPercent
          icon={<TrendingUp className="h-4 w-4" />}
          accent="emerald"
          secondary="Receita - despesa / receita"
        />
        <KpiCard
          label="Pagamentos pendentes"
          value={k.payments.pending_total}
          accent={k.payments.overdue_total > 0 ? "rose" : "amber"}
          icon={<CalendarClock className="h-4 w-4" />}
          secondary={k.payments.overdue_total > 0 ? `Vencidos: ${formatCurrency(k.payments.overdue_total)}` : "Tudo em dia"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <User className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Pessoal</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Receitas" value={k.personal.income} positive />
            <Row label="Despesas" value={k.personal.expense} negative />
            <Row label="Saldo" value={k.personal.balance} bold />
          </div>
        </div>
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Briefcase className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Empresa</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Receitas" value={k.business.income} positive />
            <Row label="Despesas" value={k.business.expense} negative />
            <Row label="Saldo" value={k.business.balance} bold />
          </div>
        </div>
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Investimentos</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Aportado" value={k.investments.invested} />
            <Row label="Valor atual" value={k.investments.current_value} bold />
            <div className="flex items-center justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-500">Retorno</span>
              <span className={k.investments.return_amount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                {formatCurrency(k.investments.return_amount)} ({formatPercent(k.investments.return_pct)})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyChart data={data.series_monthly} />
        </div>
        <CategoryPie title="Despesas por categoria" data={expensePie} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryPie title="Investimentos por tipo" data={invPie} />
        <div className="card lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-900">Próximos pagamentos</p>
          {data.upcoming_payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum pagamento programado para os próximos 30 dias.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2">Descrição</th>
                    <th className="pb-2">Vencimento</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming_payments.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="py-2 text-slate-700">{p.description}</td>
                      <td className="py-2 text-slate-500">{formatDate(p.due_date)}</td>
                      <td className="py-2"><span className="chip">{p.owner_type === "business" ? "Empresa" : "Pessoal"}</span></td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {data.goals.length > 0 && (
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-900">Metas</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{g.name}</span>
                  <span className="text-xs text-slate-500">{formatPercent(g.progress)}</span>
                </div>
                <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-brand-500" style={{ width: `${Math.min(g.progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{formatCurrency(g.current)}</span>
                  <span>{formatCurrency(g.target)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, positive, negative, bold }: { label: string; value: number; positive?: boolean; negative?: boolean; bold?: boolean }) {
  const color = positive ? "text-emerald-600" : negative ? "text-rose-600" : "text-slate-900";
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${color} ${bold ? "font-semibold" : ""} flex items-center gap-1`}>
        {positive && <ArrowUpRight className="h-3 w-3" />}
        {negative && <ArrowDownRight className="h-3 w-3" />}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function investmentLabel(t: string) {
  const map: Record<string, string> = {
    stock: "Ações",
    fund: "Fundos",
    fixed_income: "Renda fixa",
    crypto: "Cripto",
    real_estate: "Imóveis",
    other: "Outros",
  };
  return map[t] || t;
}
