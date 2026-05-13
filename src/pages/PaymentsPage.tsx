import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Category, OwnerType, Payment, PaymentStatus, Recurrence } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Vencido", color: "bg-rose-100 text-rose-700" },
  canceled: { label: "Cancelado", color: "bg-slate-100 text-slate-600" },
};

type FormState = {
  description: string;
  amount: string;
  owner_type: OwnerType;
  category_id: string;
  due_date: string;
  status: PaymentStatus;
  recurrence: Recurrence;
  payee: string;
  notes: string;
};

const empty: FormState = {
  description: "",
  amount: "",
  owner_type: "personal",
  category_id: "",
  due_date: new Date().toISOString().slice(0, 10),
  status: "pending",
  recurrence: "none",
  payee: "",
  notes: "",
};

export default function PaymentsPage() {
  const { data: items, loading, refetch } = useApiResource<Payment[]>("/payments");
  const { data: categories } = useApiResource<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    return (items || []).filter((p) => {
      if (filter === "all") return true;
      if (filter === "overdue") return p.status === "pending" && p.due_date.slice(0, 10) < today;
      return p.status === filter;
    });
  }, [items, filter, today]);

  function startCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(p: Payment) {
    setEditing(p);
    setForm({
      description: p.description,
      amount: String(p.amount),
      owner_type: p.owner_type,
      category_id: p.category_id || "",
      due_date: p.due_date.slice(0, 10),
      status: p.status,
      recurrence: p.recurrence,
      payee: p.payee || "",
      notes: p.notes || "",
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
        owner_type: form.owner_type,
        category_id: form.category_id || null,
        due_date: form.due_date,
        status: form.status,
        recurrence: form.recurrence,
        payee: form.payee || null,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/payments/${editing.id}`, payload);
        toast.success("Pagamento atualizado");
      } else {
        await api.post("/payments", payload);
        toast.success("Pagamento criado");
      }
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(id: string) {
    try {
      await api.post(`/payments/${id}/pay`);
      toast.success("Marcado como pago");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este pagamento?")) return;
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Excluído");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Pagamentos</h2>
          <p className="text-sm text-slate-500">Contas a pagar e recorrências</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Novo pagamento</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "overdue", "paid", "canceled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
            {f === "all" ? "Todos" : f === "overdue" ? "Vencidos" : STATUS_LABEL[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum pagamento" description="Cadastre pagamentos recorrentes ou avulsos." action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Criar pagamento</button>} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isOverdue = p.status === "pending" && p.due_date.slice(0, 10) < today;
                const status = isOverdue ? "overdue" : p.status;
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-500">{formatDate(p.due_date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{p.description}</div>
                      {p.payee && <div className="text-xs text-slate-500">{p.payee}</div>}
                    </td>
                    <td className="px-4 py-3"><span className="chip">{p.owner_type === "business" ? "Empresa" : "Pessoal"}</span></td>
                    <td className="px-4 py-3">
                      <span className={`chip ${STATUS_LABEL[status].color}`}>{STATUS_LABEL[status].label}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        {p.status !== "paid" && (
                          <button onClick={() => markAsPaid(p.id)} className="btn-ghost text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                        )}
                        <button onClick={() => startEdit(p)} className="btn-ghost"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(p.id)} className="btn-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar pagamento" : "Novo pagamento"}>
        <form onSubmit={handleSave} className="space-y-3">
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
              <label className="label">Vencimento</label>
              <input className="input" type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType })}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
            <div>
              <label className="label">Recorrência</label>
              <select className="input" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as Recurrence })}>
                <option value="none">Nenhuma</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })}>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sem categoria</option>
                {(categories || []).filter((c) => c.type === "expense" && c.owner_type === form.owner_type).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Beneficiário</label>
            <input className="input" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} />
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
