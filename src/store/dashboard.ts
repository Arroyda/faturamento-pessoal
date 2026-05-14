import { DashboardSummary, Investment, OwnerType, Payment, Transaction } from "@/types";
import { rawUserData } from "./repo";

interface DashboardParams {
  ownerType?: OwnerType;
  months?: number;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function round(n: number, digits = 2): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function computeSummary(params: DashboardParams = {}): DashboardSummary {
  const months = Math.min(Math.max(params.months || 6, 1), 24);
  const ownerType = params.ownerType;
  const data = rawUserData();
  const transactions: Transaction[] = data.transactions;
  const investments: Investment[] = data.investments;
  const payments: Payment[] = data.payments;
  const goals = data.goals;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startWindow = new Date(today.getFullYear(), today.getMonth() - months, 1);
  const currentMonthKey = ym(today);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomePersonal = 0;
  let incomeBusiness = 0;
  let expensePersonal = 0;
  let expenseBusiness = 0;
  let currentMonthIncome = 0;
  let currentMonthExpense = 0;

  // Installments aggregates
  let installmentsCurrentMonthTotal = 0;
  let installmentsCurrentMonthPending = 0;
  let installmentsCurrentMonthPaid = 0;
  let installmentsFuturePending = 0;
  const currentMonthInstallments: DashboardSummary["current_month_installments"] = [];

  const monthSeries = new Map<string, { income: number; expense: number }>();
  const categoryTotals = new Map<string, number>();

  for (const tx of transactions) {
    const occ = parseDate(tx.occurred_at);
    if (!occ) continue;
    const monthKey = ym(occ);
    const isInstallment = !!(tx.installment_total && tx.installment_total > 1);
    const isPaid = tx.is_paid !== false; // default true para compat
    const amount = Number(tx.amount) || 0;

    // ----- Installments (todas, mesmo fora da janela) -----
    if (isInstallment && tx.type === "expense" && (!ownerType || tx.owner_type === ownerType)) {
      if (monthKey === currentMonthKey) {
        installmentsCurrentMonthTotal += amount;
        if (isPaid) installmentsCurrentMonthPaid += amount;
        else installmentsCurrentMonthPending += amount;
        currentMonthInstallments.push({
          id: tx.id,
          description: tx.description,
          amount: round(amount),
          occurred_at: tx.occurred_at,
          installment_number: Number(tx.installment_number) || 0,
          installment_total: Number(tx.installment_total) || 0,
          is_paid: isPaid,
          owner_type: tx.owner_type,
        });
      } else if (occ > today && !isPaid) {
        installmentsFuturePending += amount;
      }
    }

    // ----- Janela do dashboard (somatórios gerais) -----
    if (occ < startWindow) continue;
    if (ownerType && tx.owner_type !== ownerType) continue;
    const slot = monthSeries.get(monthKey) || { income: 0, expense: 0 };
    if (tx.type === "income") {
      totalIncome += amount;
      slot.income += amount;
      if (tx.owner_type === "personal") incomePersonal += amount;
      else if (tx.owner_type === "business") incomeBusiness += amount;
      if (monthKey === currentMonthKey) currentMonthIncome += amount;
    } else if (tx.type === "expense") {
      totalExpense += amount;
      slot.expense += amount;
      if (tx.owner_type === "personal") expensePersonal += amount;
      else if (tx.owner_type === "business") expenseBusiness += amount;
      if (monthKey === currentMonthKey) currentMonthExpense += amount;
      const cat = tx.category_id || "uncategorized";
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + amount);
    }
    monthSeries.set(monthKey, slot);
  }

  currentMonthInstallments.sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));

  const series = Array.from(monthSeries.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, v]) => ({ month, income: round(v.income), expense: round(v.expense), net: round(v.income - v.expense) }));

  let invested = 0;
  let currentValue = 0;
  const investByType = new Map<string, number>();
  for (const inv of investments) {
    const qty = Number(inv.quantity) || 0;
    const pp = Number(inv.purchase_price) || 0;
    const cp = Number(inv.current_price) || 0;
    invested += qty * pp;
    currentValue += qty * cp;
    const t = inv.type || "other";
    investByType.set(t, (investByType.get(t) || 0) + qty * cp);
  }

  let pendingTotal = 0;
  let overdueTotal = 0;
  const upcoming: DashboardSummary["upcoming_payments"] = [];
  const todayIso = today.toISOString().slice(0, 10);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);
  const horizonIso = horizon.toISOString().slice(0, 10);

  for (const p of payments) {
    const amount = Number(p.amount) || 0;
    if (p.status !== "pending") continue;
    pendingTotal += amount;
    const due = (p.due_date || "").slice(0, 10);
    if (due && due < todayIso) overdueTotal += amount;
    if (due && due >= todayIso && due <= horizonIso) {
      upcoming.push({ id: p.id, description: p.description, amount, due_date: due, owner_type: p.owner_type });
    }
  }
  upcoming.sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

  const goalProgress = goals.map((g) => {
    const target = Number(g.target_amount) || 0;
    const cur = Number(g.current_amount) || 0;
    const progress = target > 0 ? (cur / target) * 100 : 0;
    return { id: g.id, name: g.name, target: round(target), current: round(cur), progress: round(progress) };
  });

  const ret = currentValue - invested;
  const retPct = invested > 0 ? (ret / invested) * 100 : 0;
  const saving = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return {
    kpis: {
      net_worth_estimate: round(totalIncome - totalExpense + currentValue),
      total_income: round(totalIncome),
      total_expense: round(totalExpense),
      balance: round(totalIncome - totalExpense),
      saving_rate_pct: round(saving),
      current_month_income: round(currentMonthIncome),
      current_month_expense: round(currentMonthExpense),
      current_month_balance: round(currentMonthIncome - currentMonthExpense),
      personal: {
        income: round(incomePersonal),
        expense: round(expensePersonal),
        balance: round(incomePersonal - expensePersonal),
      },
      business: {
        income: round(incomeBusiness),
        expense: round(expenseBusiness),
        balance: round(incomeBusiness - expenseBusiness),
      },
      investments: {
        invested: round(invested),
        current_value: round(currentValue),
        return_amount: round(ret),
        return_pct: round(retPct),
      },
      payments: {
        pending_total: round(pendingTotal),
        overdue_total: round(overdueTotal),
      },
      installments: {
        current_month_total: round(installmentsCurrentMonthTotal),
        current_month_pending: round(installmentsCurrentMonthPending),
        current_month_paid: round(installmentsCurrentMonthPaid),
        future_pending_total: round(installmentsFuturePending),
      },
    },
    series_monthly: series,
    expense_by_category: Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category_id, total]) => ({ category_id, total: round(total) })),
    investments_by_type: Array.from(investByType.entries()).map(([type, value]) => ({ type, value: round(value) })),
    upcoming_payments: upcoming.slice(0, 10),
    goals: goalProgress,
    current_month_installments: currentMonthInstallments,
  };
}
