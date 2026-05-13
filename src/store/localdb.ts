/**
 * Camada de baixo nível sobre localStorage com namespace + serialização JSON.
 *
 * Estrutura das chaves:
 *   fat:users         -> { users: User[] }   (lista global de contas)
 *   fat:session       -> { uid: string }     (quem está logado neste browser)
 *   fat:data:<uid>    -> { transactions: [], ... }
 */

import { Account, Category, Goal, Investment, Payment, Transaction } from "@/types";

export const PREFIX = "fat";
export const KEY_USERS = `${PREFIX}:users`;
export const KEY_SESSION = `${PREFIX}:session`;
export const dataKey = (uid: string) => `${PREFIX}:data:${uid}`;

export interface StoredUser {
  uid: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  phone: string | null;
  business_name: string | null;
  default_currency: string;
  is_admin: boolean;
  created_at: string;
}

export interface UserData {
  transactions: Transaction[];
  categories: Category[];
  investments: Investment[];
  payments: Payment[];
  accounts: Account[];
  goals: Goal[];
}

export const COLLECTIONS: (keyof UserData)[] = [
  "transactions",
  "categories",
  "investments",
  "payments",
  "accounts",
  "goals",
];

export function emptyUserData(): UserData {
  return { transactions: [], categories: [], investments: [], payments: [], accounts: [], goals: [] };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- usuários ----------

export function readUsers(): StoredUser[] {
  return readJSON<{ users: StoredUser[] }>(KEY_USERS, { users: [] }).users;
}

export function writeUsers(users: StoredUser[]): void {
  writeJSON(KEY_USERS, { users });
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const e = email.trim().toLowerCase();
  return readUsers().find((u) => u.email.toLowerCase() === e);
}

export function findUserByUid(uid: string): StoredUser | undefined {
  return readUsers().find((u) => u.uid === uid);
}

export function upsertUser(user: StoredUser): void {
  const users = readUsers();
  const idx = users.findIndex((u) => u.uid === user.uid);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeUsers(users);
}

export function patchUser(uid: string, patch: Partial<StoredUser>): StoredUser | null {
  const users = readUsers();
  const idx = users.findIndex((u) => u.uid === uid);
  if (idx < 0) return null;
  const next = { ...users[idx], ...patch, uid: users[idx].uid, email: users[idx].email };
  users[idx] = next;
  writeUsers(users);
  return next;
}

export function removeUser(uid: string): boolean {
  const users = readUsers();
  const next = users.filter((u) => u.uid !== uid);
  if (next.length === users.length) return false;
  writeUsers(next);
  localStorage.removeItem(dataKey(uid));
  return true;
}

// ---------- sessão ----------

export function getSessionUid(): string | null {
  return readJSON<{ uid: string | null }>(KEY_SESSION, { uid: null }).uid;
}

export function setSession(uid: string | null): void {
  if (uid) writeJSON(KEY_SESSION, { uid });
  else localStorage.removeItem(KEY_SESSION);
}

// ---------- dados ----------

export function loadUserData(uid: string): UserData {
  const data = readJSON<Partial<UserData>>(dataKey(uid), {});
  const merged = emptyUserData();
  for (const c of COLLECTIONS) {
    const arr = data[c];
    if (Array.isArray(arr)) (merged[c] as unknown[]) = arr as unknown[];
  }
  return merged;
}

export function saveUserData(uid: string, data: UserData): void {
  writeJSON(dataKey(uid), data);
}
