import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useApiResource } from "@/hooks/useApi";
import { api, apiError } from "@/services/api";
import { Investment, InvestmentType, OwnerType } from "@/types";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

const TYPE_LABEL: Record<InvestmentType, string> = {
  stock: "Ações",
  fund: "Fundos",
  fixed_income: "Renda fixa",
  crypto: "Cripto",
  real_estate: "Imóveis",
  other: "Outros",
};

type FormState = {
  name: string;
  ticker: string;
  type: InvestmentType;
  owner_type: OwnerType;
  quantity: string;
  purchase_price: string;
  current_price: string;
  purchase_date: string;
  broker: string;
  notes: string;
};

const empty: FormState = {
  name: "",
  ticker: "",
  type: "stock",
  owner_type: "personal",
  quantity: "",
  purchase_price: "",
  current_price: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  broker: "",
  notes: "",
};

export default function InvestmentsPage() {
  const { data: items, loading, refetch } = useApiResource<Investment[]>("/investments");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const list = items || [];
    const invested = list.reduce((s, i) => s + i.quantity * i.purchase_price, 0);
    const current = list.reduce((s, i) => s + i.quantity * i.current_price, 0);
    return { invested, current, ret: current - invested, retPct: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
  }, [items]);

  function startCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(i: Investment) {
    setEditing(i);
    setForm({
      name: i.name,
      ticker: i.ticker || "",
      type: i.type,
      owner_type: i.owner_type,
      quantity: String(i.quantity),
      purchase_price: String(i.purchase_price),
      current_price: String(i.current_price),
      purchase_date: i.purchase_date.slice(0, 10),
      broker: i.broker || "",
      notes: i.notes || "",
    });
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        ticker: form.ticker || null,
        type: form.type,
        owner_type: form.owner_type,
        quantity: Number(form.quantity),
        purchase_price: Number(form.purchase_price),
        current_price: Number(form.current_price),
        purchase_date: form.purchase_date,
        broker: form.broker || null,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/investments/${editing.id}`, payload);
        toast.success("Investimento atualizado");
      } else {
        await api.post("/investments", payload);
        toast.success("Investimento criado");
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
    if (!confirm("Excluir este investimento?")) return;
    try {
      await api.delete(`/investments/${id}`);
      toast.success("Removido");
      refetch();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Investimentos</h2>
          <p className="text-sm text-slate-500">Acompanhe seu portfólio em tempo real</p>
        </div>
        <button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Novo investimento</button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SmallCard label="Aportado" value={formatCurrency(totals.invested)} />
        <SmallCard label="Valor atual" value={formatCurrency(totals.current)} />
        <SmallCard label="Retorno (R$)" value={formatCurrency(totals.ret)} positive={totals.ret >= 0} />
        <SmallCard label="Retorno (%)" value={formatPercent(totals.retPct)} positive={totals.retPct >= 0} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>
      ) : !items || items.length === 0 ? (
        <EmptyState title="Sem investimentos" description="Adicione ativos para acompanhar performance e diversificação." action={<button onClick={startCreate} className="btn-primary"><Plus className="h-4 w-4" /> Adicionar</button>} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ativo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Preço médio</th>
                <th className="px-4 py-3 text-right">Atual</th>
                <th className="px-4 py-3 text-right">Posição</th>
                <th className="px-4 py-3 text-right">Retorno</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const pos = i.quantity * i.current_price;
                const invest = i.quantity * i.purchase_price;
                const ret = pos - invest;
                const retPct = invest > 0 ? (ret / invest) * 100 : 0;
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{i.name}</div>
                      {i.ticker && <div className="text-xs text-slate-500">{i.ticker} • {i.broker || "—"}</div>}
                    </td>
                    <td className="px-4 py-3"><span className="chip">{TYPE_LABEL[i.type]}</span></td>
                    <td className="px-4 py-3 text-right">{i.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(i.purchase_price)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(i.current_price)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(pos)}</td>
                    <td className={`px-4 py-3 text-right ${ret >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      <div className="inline-flex items-center gap-1">
                        {ret >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(ret)} ({formatPercent(retPct)})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => startEdit(i)} className="btn-ghost"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(i.id)} className="btn-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Editar investimento" : "Novo investimento"} size="lg">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Ticker / código</label>
              <input className="input" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as InvestmentType })}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={form.owner_type} onChange={(e) => setForm({ ...form, owner_type: e.target.value as OwnerType })}>
                <option value="personal">Pessoal</option>
                <option value="business">Empresa</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Quantidade</label>
              <input className="input" type="number" step="0.000001" min="0.000001" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="label">Preço médio</label>
              <input className="input" type="number" step="0.01" min="0.01" required value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </div>
            <div>
              <label className="label">Preço atual</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data de compra</label>
              <input className="input" type="date" required value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Corretora</label>
              <input className="input" value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} />
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

function SmallCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${positive === undefined ? "text-slate-900" : positive ? "text-emerald-600" : "text-rose-600"}`}>{value}</p>
    </div>
  );
}
