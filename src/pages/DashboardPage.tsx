import { useMemo } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleDollarSign,
  Layers,
  PiggyBank,
  TrendingUp,
  User,
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import MonthlyChart from "@/components/charts/MonthlyChart";
import CategoryPie from "@/components/charts/CategoryPie";
import { useApiResource } from "@/hooks/useApi";
import { Category, DashboardSummary } from "@/types";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { api, apiError } from "@/services/api";

export default function DashboardPage() {
  const { data, loading, refetch } = useApiResource<DashboardSummary>("/dashboard/summary?months=6");
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

  async function togglePaid(id: string, current: boolean) {
    try {
      await api.put(`/transactions/${id}`, { is_paid: !current });
      toast.success(!current ? "Parcela marcada como paga" : "Parcela marcada como pendente");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

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
          label="Parcelas no mês"
          value={k.installments.current_month_total}
          accent={k.installments.current_month_pending > 0 ? "rose" : "emerald"}
          icon={<Layers className="h-4 w-4" />}
          secondary={`Pendente ${formatCurrency(k.installments.current_month_pending)} • Pago ${formatCurrency(k.installments.current_month_paid)}`}
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <User className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pessoal</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Receitas" value={k.personal.income} positive />
            <Row label="Despesas" value={k.personal.expense} negative />
            <Row label="Saldo" value={k.personal.balance} bold />
          </div>
        </div>
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Briefcase className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Empresa</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Receitas" value={k.business.income} positive />
            <Row label="Despesas" value={k.business.expense} negative />
            <Row label="Saldo" value={k.business.balance} bold />
          </div>
        </div>
        <div className="card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Investimentos</p>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Aportado" value={k.investments.invested} />
            <Row label="Valor atual" value={k.investments.current_value} bold />
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Retorno</span>
              <span className={k.investments.return_amount >= 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-600 dark:text-rose-400"}>
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

      {/* Parcelas do mês */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <Layers className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parcelas deste mês</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip">Total: <strong className="ml-1">{formatCurrency(k.installments.current_month_total)}</strong></span>
            <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              Pendente: <strong className="ml-1">{formatCurrency(k.installments.current_month_pending)}</strong>
            </span>
            <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Pago: <strong className="ml-1">{formatCurrency(k.installments.current_month_paid)}</strong>
            </span>
          </div>
        </div>
        {data.current_month_installments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhuma parcela com vencimento neste mês.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {data.current_month_installments.map((p) => (
              <div
                key={p.id}
                className={
                  "flex items-center justify-between rounded-xl border px-3 py-2 text-sm " +
                  (p.is_paid
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-500/10"
                    : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-500/10")
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">{p.description}</span>
                    <span className="chip">{p.installment_number}/{p.installment_total}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(p.occurred_at)} • {formatCurrency(p.amount)} • {p.owner_type === "business" ? "Empresa" : "Pessoal"}
                  </div>
                </div>
                <button
                  onClick={() => togglePaid(p.id, p.is_paid)}
                  className={
                    "ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition " +
                    (p.is_paid
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700")
                  }
                >
                  {p.is_paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                  {p.is_paid ? "Pago" : "Pendente"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryPie title="Investimentos por tipo" data={invPie} />
        <div className="card lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Próximos pagamentos</p>
          {data.upcoming_payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum pagamento programado para os próximos 30 dias.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                      <td className="py-2 text-slate-700 dark:text-slate-200">{p.description}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400">{formatDate(p.due_date)}</td>
                      <td className="py-2"><span className="chip">{p.owner_type === "business" ? "Empresa" : "Pessoal"}</span></td>
                      <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(p.amount)}</td>
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
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Metas</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{g.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatPercent(g.progress)}</span>
                </div>
                <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-brand-500" style={{ width: `${Math.min(g.progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
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
  const color = positive ? "text-emerald-600 dark:text-emerald-400" : negative ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
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
