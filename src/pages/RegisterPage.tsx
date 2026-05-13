import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, PiggyBank, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

function passwordStrength(p: string) {
  const checks = {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    number: /[0-9]/.test(p),
    symbol: /[^A-Za-z0-9]/.test(p),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score };
}

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (strength.score < 4) {
      toast.error("Senha precisa atender os requisitos mínimos");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
      toast.success("Conta criada!");
      navigate("/dashboard");
    } catch (err) {
      toast.error((err as Error).message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  const reqs = [
    { ok: strength.checks.length, label: "Pelo menos 8 caracteres" },
    { ok: strength.checks.upper, label: "1 letra maiúscula" },
    { ok: strength.checks.lower, label: "1 letra minúscula" },
    { ok: strength.checks.number, label: "1 número" },
    { ok: strength.checks.symbol, label: "1 caractere especial" },
  ];

  const strengthColor = strength.score >= 5 ? "bg-emerald-500" : strength.score >= 4 ? "bg-amber-500" : strength.score >= 2 ? "bg-orange-500" : "bg-rose-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <PiggyBank className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Criar conta</h1>
          <p className="text-sm text-slate-500">Comece a organizar suas finanças em minutos</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como podemos te chamar" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full transition-all ${strengthColor}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                {reqs.map((r) => (
                  <li key={r.label} className={`flex items-center gap-1 ${r.ok ? "text-emerald-600" : "text-slate-400"}`}>
                    {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input type={showPwd ? "text" : "password"} required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
