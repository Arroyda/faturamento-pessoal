import { UserData, loadUserData, saveUserData, COLLECTIONS } from "./localdb";
import { newUid, nowIso } from "./crypto";
import { currentUid } from "./auth";

type CollectionName = keyof UserData;

export interface Filter {
  field: string;
  op: "==" | "!=" | ">" | ">=" | "<" | "<=";
  value: unknown;
}

export interface ListOptions {
  filters?: Filter[];
  orderBy?: string;
  desc?: boolean;
  limit?: number;
}

function compare(op: Filter["op"], a: unknown, b: unknown): boolean {
  if (a === undefined || a === null) return false;
  if (typeof a === "string" && typeof b === "string") {
    const isDateA = /^\d{4}-\d{2}-\d{2}/.test(a);
    const isDateB = /^\d{4}-\d{2}-\d{2}/.test(b);
    if (isDateA && isDateB) {
      const da = a.slice(0, 10);
      const db = b.slice(0, 10);
      return cmpValues(op, da, db);
    }
  }
  return cmpValues(op, a, b);
}

function cmpValues(op: Filter["op"], a: unknown, b: unknown): boolean {
  switch (op) {
    case "==": return a === b;
    case "!=": return a !== b;
    case ">":  return (a as never) > (b as never);
    case ">=": return (a as never) >= (b as never);
    case "<":  return (a as never) < (b as never);
    case "<=": return (a as never) <= (b as never);
  }
}

function sortKey(item: Record<string, unknown>, field: string): unknown {
  const v = item[field];
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  return v;
}

export const repo = {
  list<T extends { id: string }>(collection: CollectionName, opts: ListOptions = {}): T[] {
    const uid = currentUid();
    const data = loadUserData(uid);
    let items = ([...(data[collection] as unknown as T[])]) || [];
    if (opts.filters) {
      for (const f of opts.filters) {
        items = items.filter((it) => compare(f.op, (it as Record<string, unknown>)[f.field], f.value));
      }
    }
    if (opts.orderBy) {
      const field = opts.orderBy;
      const desc = opts.desc !== false;
      items.sort((a, b) => {
        const av = sortKey(a as Record<string, unknown>, field);
        const bv = sortKey(b as Record<string, unknown>, field);
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        if ((av as never) > (bv as never)) return desc ? -1 : 1;
        return desc ? 1 : -1;
      });
    }
    if (opts.limit) items = items.slice(0, opts.limit);
    return items;
  },

  get<T extends { id: string }>(collection: CollectionName, id: string): T | null {
    const uid = currentUid();
    const data = loadUserData(uid);
    const items = data[collection] as unknown as T[];
    return items.find((it) => it.id === id) || null;
  },

  create<T extends { id: string }>(collection: CollectionName, payload: Record<string, unknown>): T {
    const uid = currentUid();
    const data = loadUserData(uid);
    const now = nowIso();
    const item = {
      id: newUid(),
      ...payload,
      user_id: uid,
      created_at: now,
      updated_at: now,
    } as unknown as T;
    (data[collection] as unknown as T[]).push(item);
    saveUserData(uid, data);
    return item;
  },

  update<T extends { id: string }>(collection: CollectionName, id: string, payload: Record<string, unknown>): T | null {
    const uid = currentUid();
    const data = loadUserData(uid);
    const items = data[collection] as unknown as T[];
    const idx = items.findIndex((it) => it.id === id);
    if (idx < 0) return null;
    const updated = { ...items[idx], ...payload, updated_at: nowIso() } as T;
    items[idx] = updated;
    saveUserData(uid, data);
    return updated;
  },

  remove(collection: CollectionName, id: string): boolean {
    const uid = currentUid();
    const data = loadUserData(uid);
    const items = data[collection] as unknown as { id: string }[];
    const next = items.filter((it) => it.id !== id);
    if (next.length === items.length) return false;
    (data[collection] as unknown) = next;
    saveUserData(uid, data);
    return true;
  },
};

export function wipeUserData(): void {
  const uid = currentUid();
  saveUserData(uid, { transactions: [], categories: [], investments: [], payments: [], accounts: [], goals: [] });
}

export function rawUserData() {
  return loadUserData(currentUid());
}

export function replaceUserData(payload: Partial<UserData>): Record<string, number> {
  const uid = currentUid();
  const out: UserData = { transactions: [], categories: [], investments: [], payments: [], accounts: [], goals: [] };
  const counts: Record<string, number> = {};
  for (const c of COLLECTIONS) {
    const arr = (payload[c] || []) as Record<string, unknown>[];
    const normalized = (Array.isArray(arr) ? arr : []).map((it) => ({
      ...it,
      id: typeof it.id === "string" && it.id ? it.id : newUid(),
      user_id: uid,
    }));
    (out[c] as unknown) = normalized;
    counts[c] = normalized.length;
  }
  saveUserData(uid, out);
  return counts;
}
