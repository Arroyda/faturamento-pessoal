import { Category, OwnerType, TransactionType } from "@/types";
import { newUid, nowIso } from "./crypto";

interface CategorySeed {
  name: string;
  type: TransactionType;
  owner_type: OwnerType;
  color: string;
}

const DEFAULT_CATEGORIES: CategorySeed[] = [
  { name: "Moradia", type: "expense", owner_type: "personal", color: "#176ef5" },
  { name: "Alimentação", type: "expense", owner_type: "personal", color: "#10b981" },
  { name: "Transporte", type: "expense", owner_type: "personal", color: "#f59e0b" },
  { name: "Saúde", type: "expense", owner_type: "personal", color: "#ef4444" },
  { name: "Lazer", type: "expense", owner_type: "personal", color: "#8b5cf6" },
  { name: "Educação", type: "expense", owner_type: "personal", color: "#06b6d4" },
  { name: "Assinaturas", type: "expense", owner_type: "personal", color: "#ec4899" },
  { name: "Salário", type: "income", owner_type: "personal", color: "#10b981" },
  { name: "Freelance", type: "income", owner_type: "personal", color: "#84cc16" },
  { name: "Investimentos", type: "income", owner_type: "personal", color: "#a855f7" },
  { name: "Folha de pagamento", type: "expense", owner_type: "business", color: "#ef4444" },
  { name: "Fornecedores", type: "expense", owner_type: "business", color: "#f59e0b" },
  { name: "Impostos", type: "expense", owner_type: "business", color: "#64748b" },
  { name: "Marketing", type: "expense", owner_type: "business", color: "#ec4899" },
  { name: "Infraestrutura", type: "expense", owner_type: "business", color: "#06b6d4" },
  { name: "Vendas", type: "income", owner_type: "business", color: "#10b981" },
  { name: "Serviços", type: "income", owner_type: "business", color: "#176ef5" },
];

export function buildDefaultCategories(uid: string): Category[] {
  const now = nowIso();
  return DEFAULT_CATEGORIES.map((c) => ({
    id: newUid(),
    user_id: uid,
    name: c.name,
    type: c.type,
    owner_type: c.owner_type,
    color: c.color,
    icon: null,
    created_at: now,
  }));
}
