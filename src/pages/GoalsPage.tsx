import { useState } from "react";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Goal, OwnerType } from "@/types";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

type FormState = { name: string; target_amount: string; current_amount: string; target_date: string; owner_type: OwnerType; notes: string };

const empty: FormState = { name: "", target_amount: "", current_amount: "0", target_date: "", owner_type: "personal", notes: "" };

export default function GoalsPage() {
  const { data: items, loading, refetch } = useApiResource<Goal[]>("/goals");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(g: Goal) {
    setEditing(g);
    setForm({
      name: g.name,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      target_date: g.target_date?.slice(0, 10) || "",
      owner_type: g.owner_type,
      notes: g.notes || "",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        target_amount: Number(form.target_amount),
        current_amount: Number(form.current_amount),
        target_date: form.target_date || null,
        owner_type: form.owner_type,
        notes: form.notes || null,
      };
      if (editing) await api.put(`/goals/${editing.id}`, payload);
      else await api.post("/goals", payload);
      toast.success("Salvo");
      setOpen(false);
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir meta?")) return;
    try { await api.delete(`/goals/${id}`); refetch(); toast.success("Excluído"); }
    catch (e) { toast.error(apiError(e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Metas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Defina objetivos e acompanhe o progresso</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Nova meta</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="Sem metas" description="Defina objetivos financeiros e acompanhe o progresso." icon={<Target className="h-8 w-8" />} action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Criar meta</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => {
            const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            return (
              <div key={g.id} className="card">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{g.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{g.owner_type === "business" ? "Empresa" : "Pessoal"} {g.target_date && `• ${formatDate(g.target_date)}`}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost" onClick={() => startEdit(g)}><Pencil className="h-3.5 w-3.5" /></button>
                    <button className="btn-danger" onClick={() => handleDelete(g.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{formatPercent(progress)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar meta" : "Nova meta"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor alvo</label>
              <input className="input" type="number" step="0.01" min="0.01" required value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Acumulado</label>
              <input className="input" type="number" step="0.01" min="0" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data limite</label>
              <input className="input" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType })}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
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
