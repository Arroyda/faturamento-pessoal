export type OwnerType = "personal" | "business";
export type TransactionType = "income" | "expense";
export type PaymentStatus = "pending" | "paid" | "overdue" | "canceled";
export type InvestmentType = "stock" | "fund" | "fixed_income" | "crypto" | "real_estate" | "other";
export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface UserProfile {
  uid: string;
  email: string;
  display_name?: string | null;
  phone?: string | null;
  business_name?: string | null;
  default_currency: string;
  is_admin: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  owner_type: OwnerType;
  category_id?: string | null;
  account_id?: string | null;
  occurred_at: string;
  notes?: string | null;
  recurrence: Recurrence;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  owner_type: OwnerType;
  color: string;
  icon?: string | null;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  ticker?: string | null;
  type: InvestmentType;
  owner_type: OwnerType;
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  broker?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  owner_type: OwnerType;
  category_id?: string | null;
  due_date: string;
  status: PaymentStatus;
  recurrence: Recurrence;
  payee?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  owner_type: OwnerType;
  institution?: string | null;
  initial_balance: number;
  currency: string;
  color: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  owner_type: OwnerType;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  kpis: {
    net_worth_estimate: number;
    total_income: number;
    total_expense: number;
    balance: number;
    saving_rate_pct: number;
    current_month_income: number;
    current_month_expense: number;
    current_month_balance: number;
    personal: { income: number; expense: number; balance: number };
    business: { income: number; expense: number; balance: number };
    investments: { invested: number; current_value: number; return_amount: number; return_pct: number };
    payments: { pending_total: number; overdue_total: number };
  };
  series_monthly: { month: string; income: number; expense: number; net: number }[];
  expense_by_category: { category_id: string; total: number }[];
  investments_by_type: { type: string; value: number }[];
  upcoming_payments: { id: string; description: string; amount: number; due_date: string; owner_type: OwnerType }[];
  goals: { id: string; name: string; target: number; current: number; progress: number }[];
}
