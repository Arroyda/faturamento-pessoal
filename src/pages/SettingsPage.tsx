import { useEffect, useRef, useState } from "react";
import { Download, Upload, Lock, Shield, ShieldAlert, Trash2, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api, apiError } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { replaceUserData } from "@/store/repo";

export default function SettingsPage() {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [form, setForm] = useState({ display_name: "", phone: "", business_name: "", default_currency: "BRL" });
  const [saving, setSaving] = useState(false);

  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        display_name: user.display_name || "",
        phone: user.phone || "",
        business_name: user.business_name || "",
        default_currency: user.default_currency || "BRL",
      });
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwdNew !== pwdConfirm) {
      toast.error("Senhas não coincidem");
      return;
    }
    setChangingPwd(true);
    try {
      await changePassword(pwdCurrent, pwdNew);
      toast.success("Senha alterada");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setChangingPwd(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { data } = await api.get<Record<string, unknown>>("/data/export");
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const filename = `fat-finance-${user?.email.split("@")[0]}-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Importar "${file.name}"? Isso substituirá todos os seus dados atuais.`)) {
      e.target.value = "";
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const counts = replaceUserData(parsed);
      const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ");
      toast.success(`Importado — ${summary}`);
    } catch (err) {
      toast.error(`JSON inválido: ${(err as Error).message}`);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  async function handleWipe() {
    if (!confirm("Apagar TODOS os seus dados? A conta continua, mas tudo (transações, investimentos etc) será zerado.")) return;
    if (!confirm("Tem certeza? Esta ação é irreversível (a menos que você tenha um backup).")) return;
    try {
      await api.delete("/data/wipe");
      toast.success("Dados apagados");
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500">Gerencie seu perfil, segurança e dados</p>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900">Perfil</h3>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50" value={user.email} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Moeda padrão</label>
              <select className="input" value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })}>
                <option value="BRL">BRL — Real</option>
                <option value="USD">USD — Dólar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nome da empresa</label>
            <input className="input" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Salvando..." : "Salvar alterações"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Backup — Export / Import</h3>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Baixe um JSON com todos os seus dados para guardar como backup ou levar para outro browser/máquina. Importar substitui completamente os dados existentes.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} disabled={exporting} className="btn-primary">
            <Download className="h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar JSON"}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary">
            <Upload className="h-4 w-4" />
            {importing ? "Importando..." : "Importar JSON"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-900">Alterar senha</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Senha atual</label>
            <input className="input" type="password" required value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nova senha</label>
              <input className="input" type="password" required minLength={8} value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirmar</label>
              <input className="input" type="password" required minLength={8} value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={changingPwd} className="btn-primary">{changingPwd ? "Alterando..." : "Alterar senha"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Segurança</h3>
        </div>
        <ul className="ml-4 list-disc space-y-1 text-xs text-slate-600">
          <li>Senhas armazenadas com hash PBKDF2-SHA256 (200k iterações) usando Web Crypto API nativa do browser.</li>
          <li>Os dados ficam isolados em <code>localStorage</code> do browser deste dispositivo.</li>
          <li>Faça backups regulares com <strong>Exportar JSON</strong> — limpar o navegador apaga tudo.</li>
          <li>Para sincronizar entre dispositivos, exporte aqui e importe no outro browser.</li>
        </ul>
      </div>

      <div className="card border-rose-200 bg-rose-50/50">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <h3 className="text-sm font-semibold text-rose-900">Zona de risco</h3>
        </div>
        <p className="mb-3 text-xs text-rose-700">Apaga todas as transações, investimentos, pagamentos, contas, categorias e metas. A conta permanece, mas os dados zeram. Exporte um backup antes.</p>
        <div className="flex gap-2">
          <button onClick={handleWipe} className="btn-danger"><Trash2 className="h-4 w-4" />Apagar todos os dados</button>
          <button onClick={() => { logout(); }} className="btn-secondary">Sair</button>
        </div>
      </div>
    </div>
  );
}
