import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Category, OwnerType, TransactionType } from "@/types";

const PRESET_COLORS = ["#176ef5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#64748b", "#a855f7"];

type FormState = { name: string; type: TransactionType; owner_type: OwnerType; color: string };

const empty: FormState = { name: "", type: "expense", owner_type: "personal", color: PRESET_COLORS[0] };

export default function CategoriesPage() {
  const { data: items, loading, refetch } = useApiResource<Category[]>("/categories");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, type: c.type, owner_type: c.owner_type, color: c.color });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, { name: form.name, color: form.color });
      } else {
        await api.post("/categories", form);
      }
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
    if (!confirm("Excluir categoria?")) return;
    try {
      await api.delete(`/categories/${id}`);
      refetch();
      toast.success("Excluído");
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Categorias</h2>
          <p className="text-sm text-slate-500">Organize transações e pagamentos</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Nova categoria</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="Sem categorias" description="Crie categorias para classificar suas transações." action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Criar</button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.type === "income" ? "Receita" : "Despesa"} • {c.owner_type === "business" ? "Empresa" : "Pessoal"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-danger" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar categoria" : "Nova categoria"}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} disabled={!!editing}>
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType })} disabled={!!editing}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-lg border-2 ${form.color === c ? "border-slate-900" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
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
