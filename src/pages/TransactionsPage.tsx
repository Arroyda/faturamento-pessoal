import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
};

const empty: FormState = {
  description: "",
  amount: "",
  type: "expense",
  owner_type: "personal",
  category_id: "",
  occurred_at: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function TransactionsPage() {
  const { data: items, loading, refetch } = useApiResource<Transaction[]>("/transactions");
  const { data: categories } = useApiResource<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterOwner, setFilterOwner] = useState<"all" | OwnerType>("all");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (items || []).filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterOwner !== "all" && t.owner_type !== filterOwner) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filterType, filterOwner]);

  const catMap = useMemo(() => new Map((categories || []).map((c) => [c.id, c])), [categories]);

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
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
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
      if (editing) {
        await api.put(`/transactions/${editing.id}`, payload);
        toast.success("Transação atualizada");
      } else {
        await api.post("/transactions", payload);
        toast.success("Transação criada");
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

  const filteredCategories = (categories || []).filter((c) => c.type === form.type && c.owner_type === form.owner_type);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Transações</h2>
          <p className="text-sm text-slate-500">Receitas e despesas de uso pessoal e empresarial</p>
        </div>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Nova transação
        </button>
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
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cat = t.category_id ? catMap.get(t.category_id) : undefined;
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{formatDate(t.occurred_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.description}</div>
                      {t.notes && <div className="text-xs text-slate-500">{t.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {cat ? (
                        <span className="chip" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>{cat.name}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip">{t.owner_type === "business" ? "Empresa" : "Pessoal"}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      <span className="inline-flex items-center gap-1">
                        {t.type === "income" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => startEdit(t)} className="btn-ghost"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(t.id)} className="btn-danger"><Trash2 className="h-3.5 w-3.5" /></button>
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
              <label className="label">Valor (R$)</label>
              <input className="input" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Data</label>
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
