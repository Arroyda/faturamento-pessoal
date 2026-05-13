import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function Header() {
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-base font-semibold text-slate-900">Olá, {user?.display_name || user?.email?.split("@")[0]}</h1>
        <p className="text-xs text-slate-500">Tenha controle completo do seu financeiro</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 sm:flex">
          <UserIcon className="h-3.5 w-3.5" />
          {user?.email}
          {user?.is_admin && <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700">admin</span>}
        </div>
        <button onClick={handleLogout} className="btn-ghost">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
