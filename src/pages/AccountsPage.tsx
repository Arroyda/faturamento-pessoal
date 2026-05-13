import { useState } from "react";
import { Plus, Trash2, Pencil, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Account, OwnerType } from "@/types";
import { formatCurrency } from "@/lib/utils";

type FormState = { name: string; owner_type: OwnerType; institution: string; initial_balance: string; currency: string; color: string };

const empty: FormState = { name: "", owner_type: "personal", institution: "", initial_balance: "0", currency: "BRL", color: "#0ea5e9" };

export default function AccountsPage() {
  const { data: items, loading, refetch } = useApiResource<Account[]>("/accounts");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  function startCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function startEdit(a: Account) {
    setEditing(a);
    setForm({ name: a.name, owner_type: a.owner_type, institution: a.institution || "", initial_balance: String(a.initial_balance), currency: a.currency, color: a.color });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, owner_type: form.owner_type, institution: form.institution || null, initial_balance: Number(form.initial_balance), currency: form.currency, color: form.color };
      if (editing) await api.put(`/accounts/${editing.id}`, payload);
      else await api.post("/accounts", payload);
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
    if (!confirm("Excluir conta?")) return;
    try { await api.delete(`/accounts/${id}`); refetch(); toast.success("Excluído"); }
    catch (e) { toast.error(apiError(e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Contas</h2>
          <p className="text-sm text-slate-500">Contas bancárias, carteiras e cartões</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Nova conta</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="Sem contas" description="Adicione contas para organizar seus saldos." action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Adicionar</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: a.color }}>
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.institution || "—"} • {a.owner_type === "business" ? "Empresa" : "Pessoal"}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatCurrency(a.initial_balance, a.currency)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost" onClick={() => startEdit(a)}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-danger" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar conta" : "Nova conta"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType })} disabled={!!editing}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
            <div>
              <label className="label">Instituição</label>
              <input className="input" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Saldo inicial</label>
              <input className="input" type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} disabled={!!editing} />
            </div>
            <div>
              <label className="label">Moeda</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!!editing}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cor</label>
            <input className="input" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
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
