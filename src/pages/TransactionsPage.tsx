import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  CircleDashed,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Category, OwnerType, Transaction, TransactionType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type FormState = {
  description: string;
  amount: string;
  type: TransactionType;
  owner_type: OwnerType;
  category_id: string;
  occurred_at: string;
  notes: string;
  // installments
  is_installment: boolean;
  installments: string;
  is_paid: boolean;
};

const empty: FormState = {
  description: "",
  amount: "",
  type: "expense",
  owner_type: "personal",
  category_id: "",
  occurred_at: new Date().toISOString().slice(0, 10),
  notes: "",
  is_installment: false,
  installments: "2",
  is_paid: true,
};

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TransactionsPage() {
  const { data: items, loading, refetch } = useApiResource<Transaction[]>("/transactions");
  const { data: categories } = useApiResource<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterOwner, setFilterOwner] = useState<"all" | OwnerType>("all");
  const [filterInstallments, setFilterInstallments] = useState<"all" | "only" | "pending" | "paid">("all");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (items || []).filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterOwner !== "all" && t.owner_type !== filterOwner) return false;
      const isInst = !!(t.installment_total && t.installment_total > 1);
      if (filterInstallments === "only" && !isInst) return false;
      if (filterInstallments === "pending" && (!isInst || t.is_paid !== false)) return false;
      if (filterInstallments === "paid" && (!isInst || t.is_paid === false)) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filterType, filterOwner, filterInstallments]);

  const catMap = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);

  // Resumo de parcelas no mês corrente
  const monthSummary = useMemo(() => {
    const ym = currentYm();
    let total = 0;
    let pending = 0;
    let paid = 0;
    const list: Transaction[] = [];
    for (const t of items || []) {
      if (!(t.installment_total && t.installment_total > 1)) continue;
      if (t.type !== "expense") continue;
      if (!t.occurred_at?.startsWith(ym)) continue;
      const amt = Number(t.amount) || 0;
      total += amt;
      if (t.is_paid === false) pending += amt;
      else paid += amt;
      list.push(t);
    }
    list.sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));
    return { total, pending, paid, list };
  }, [items]);

  function startCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(t: Transaction) {
    setEditing(t);
    setForm({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      owner_type: t.owner_type,
      category_id: t.category_id || "",
      occurred_at: t.occurred_at.slice(0, 10),
      notes: t.notes || "",
      is_installment: false, // não permite trocar de plano simples ↔ parcelado na edição
      installments: String(t.installment_total || 2),
      is_paid: t.is_paid !== false,
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!editing && form.is_installment) {
        // criar parcelas
        const N = Math.max(2, Math.floor(Number(form.installments) || 2));
        const total = Number(form.amount);
        if (!Number.isFinite(total) || total <= 0) {
          toast.error("Informe um valor total válido");
          return;
        }
        await api.post("/transactions/installments", {
          description: form.description,
          amount: total,
          type: form.type,
          owner_type: form.owner_type,
          category_id: form.category_id || null,
          occurred_at: form.occurred_at,
          notes: form.notes || null,
          installments: N,
        });
        toast.success(`${N} parcelas criadas`);
      } else {
        const payload: Record<string, unknown> = {
          description: form.description,
          amount: Number(form.amount),
          type: form.type,
          owner_type: form.owner_type,
          category_id: form.category_id || null,
          occurred_at: form.occurred_at,
          notes: form.notes || null,
          recurrence: "none",
          tags: [] as string[],
        };
        if (editing && editing.installment_total && editing.installment_total > 1) {
          payload.is_paid = form.is_paid;
        }
        if (editing) {
          await api.put(`/transactions/${editing.id}`, payload);
          toast.success("Transação atualizada");
        } else {
          await api.post("/transactions", payload);
          toast.success("Transação criada");
        }
      }
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta transação?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transação excluída");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Excluir TODAS as parcelas deste lançamento?")) return;
    try {
      await api.delete(`/transactions/installments/group/${groupId}`);
      toast.success("Parcelas removidas");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  async function togglePaid(t: Transaction) {
    try {
      const next = !(t.is_paid !== false);
      await api.put(`/transactions/${t.id}`, { is_paid: next });
      toast.success(next ? "Parcela marcada como paga" : "Parcela marcada como pendente");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  const filteredCategories = (categories || []).filter((c) => c.type === form.type && c.owner_type === form.owner_type);

  const totalInstallments = Math.max(2, Math.floor(Number(form.installments) || 2));
  const totalAmount = Number(form.amount);
  const perInstallment = form.is_installment && totalInstallments > 0 && Number.isFinite(totalAmount) && totalAmount > 0
    ? totalAmount / totalInstallments
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Transações</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Receitas, despesas e parcelas — pessoal e empresarial</p>
        </div>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Nova transação
        </button>
      </div>

      {/* Resumo de parcelas no mês */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parcelas deste mês</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total a pagar e o que já foi quitado</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip">Total: <strong className="ml-1">{formatCurrency(monthSummary.total)}</strong></span>
            <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              Pendente: <strong className="ml-1">{formatCurrency(monthSummary.pending)}</strong>
            </span>
            <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Pago: <strong className="ml-1">{formatCurrency(monthSummary.paid)}</strong>
            </span>
          </div>
        </div>

        {monthSummary.list.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhuma parcela cadastrada para o mês atual.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {monthSummary.list.map((t) => {
              const paid = t.is_paid !== false;
              return (
                <div
                  key={t.id}
                  className={
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm " +
                    (paid
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-500/10"
                      : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-500/10")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-slate-100">{t.description}</span>
                      <span className="chip">{t.installment_number}/{t.installment_total}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(t.occurred_at)} • {formatCurrency(t.amount)}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePaid(t)}
                    className={
                      "ml-2 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition " +
                      (paid
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700")
                    }
                  >
                    {paid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                    {paid ? "Pago" : "Marcar pago"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[160px]" value={filterType} onChange={(e) => setFilterType(e.target.value as "all" | TransactionType)}>
          <option value="all">Tipo: todos</option>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </select>
        <select className="input max-w-[160px]" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value as "all" | OwnerType)}>
          <option value="all">Origem: todos</option>
          <option value="personal">Pessoal</option>
          <option value="business">Empresa</option>
        </select>
        <select
          className="input max-w-[180px]"
          value={filterInstallments}
          onChange={(e) => setFilterInstallments(e.target.value as "all" | "only" | "pending" | "paid")}
        >
          <option value="all">Parcelas: todas</option>
          <option value="only">Apenas parcelas</option>
          <option value="pending">Parcelas pendentes</option>
          <option value="paid">Parcelas pagas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma transação encontrada"
          description="Crie sua primeira transação para começar a acompanhar suas finanças."
          action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Criar transação</button>}
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cat = t.category_id ? catMap.get(t.category_id) : undefined;
                const isInst = !!(t.installment_total && t.installment_total > 1);
                const paid = t.is_paid !== false;
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(t.occurred_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{t.description}</span>
                        {isInst && (
                          <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                            {t.installment_number}/{t.installment_total}
                          </span>
                        )}
                      </div>
                      {t.notes && <div className="text-xs text-slate-500 dark:text-slate-400">{t.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {cat ? (
                        <span className="chip" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.name}</span>
                      ) : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip">{t.owner_type === "business" ? "Empresa" : "Pessoal"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isInst ? (
                        <button
                          onClick={() => togglePaid(t)}
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition " +
                            (paid
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                              : "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30")
                          }
                          title="Alternar status"
                        >
                          {paid ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                          {paid ? "Pago" : "Pendente"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      <span className="inline-flex items-center gap-1">
                        {t.type === "income" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => startEdit(t)} className="btn-ghost" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                        {isInst && t.installment_group_id && (
                          <button
                            onClick={() => handleDeleteGroup(t.installment_group_id as string)}
                            className="btn-danger"
                            title="Excluir todas as parcelas deste grupo"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(t.id)} className="btn-danger" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar transação" : "Nova transação"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType, category_id: "" })}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType, category_id: "" })}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{form.is_installment ? "Valor total (R$)" : "Valor (R$)"}</label>
              <input className="input" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">{form.is_installment ? "Data da 1ª parcela" : "Data"}</label>
              <input className="input" type="date" required value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Parcelamento — apenas em CRIAÇÃO de DESPESA */}
          {!editing && form.type === "expense" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={form.is_installment}
                  onChange={(e) => setForm({ ...form, is_installment: e.target.checked })}
                />
                <Layers className="h-4 w-4" /> Parcelar despesa
              </label>
              {form.is_installment && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nº de parcelas</label>
                    <input
                      className="input"
                      type="number"
                      min="2"
                      max="120"
                      step="1"
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Valor por parcela</label>
                    <div className="input bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {perInstallment > 0 ? formatCurrency(perInstallment) : "—"}
                    </div>
                  </div>
                  <p className="col-span-2 text-xs text-slate-500 dark:text-slate-400">
                    Serão criadas {totalInstallments} despesas mensais a partir da data informada.
                    Você pode marcar cada parcela como paga depois.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status pago/pendente — apenas em EDIÇÃO de parcela */}
          {editing && editing.installment_total && editing.installment_total > 1 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={form.is_paid}
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                />
                <CheckCircle2 className="h-4 w-4" /> Marcar parcela como paga ({editing.installment_number}/{editing.installment_total})
              </label>
            </div>
          )}

          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
