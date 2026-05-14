import { LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import toast from "react-hot-toast";

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  function handleLogout() {
    logout();
    toast.success("Sessão encerrada");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Olá, {user?.display_name || user?.email?.split("@")[0]}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Tenha controle completo do seu financeiro</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 sm:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <UserIcon className="h-3.5 w-3.5" />
          {user?.email}
          {user?.is_admin && (
            <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              admin
            </span>
          )}
        </div>
        <button
          onClick={toggle}
          className="btn-ghost"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">{theme === "dark" ? "Claro" : "Escuro"}</span>
        </button>
        <button onClick={handleLogout} className="btn-ghost">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
