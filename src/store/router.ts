/**
 * Faz roteamento de "API calls" para handlers locais.
 * Substitui o axios: cada chamada é resolvida em memória contra o localStorage.
 */

import { OwnerType, TransactionType, PaymentStatus } from "@/types";
import { UserData } from "./localdb";
import { currentProfile, currentUid, updateProfile } from "./auth";
import { Filter, ListOptions, rawUserData, repo, replaceUserData, wipeUserData } from "./repo";
import { computeSummary } from "./dashboard";
import { nowIso } from "./crypto";

type Method = "GET" | "POST" | "PUT" | "DELETE";

function parsePath(pathAndQuery: string): { path: string; query: URLSearchParams } {
  const [path, qs = ""] = pathAndQuery.split("?");
  return { path: path.replace(/\/+$/g, ""), query: new URLSearchParams(qs) };
}

function notFound(method: Method, path: string): never {
  throw new ApiError(404, `Rota não encontrada: ${method} ${path}`);
}

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(detail);
  }
}

function authedUid(): string {
  try {
    return currentUid();
  } catch {
    throw new ApiError(401, "Não autenticado");
  }
}

function buildTxFilters(q: URLSearchParams): Filter[] {
  const filters: Filter[] = [];
  const owner = q.get("owner_type") as OwnerType | null;
  const type = q.get("type") as TransactionType | null;
  const cat = q.get("category_id");
  const start = q.get("start_date");
  const end = q.get("end_date");
  if (owner) filters.push({ field: "owner_type", op: "==", value: owner });
  if (type) filters.push({ field: "type", op: "==", value: type });
  if (cat) filters.push({ field: "category_id", op: "==", value: cat });
  if (start) filters.push({ field: "occurred_at", op: ">=", value: start });
  if (end) filters.push({ field: "occurred_at", op: "<=", value: end });
  return filters;
}

export async function route<T>(method: Method, pathAndQuery: string, body?: unknown): Promise<T> {
  // microtask para deixar o consumidor parecer async
  await Promise.resolve();
  const { path, query } = parsePath(pathAndQuery);

  // --- AUTH ---
  if (path === "/auth/me") {
    if (method === "GET") {
      authedUid();
      return currentProfile() as unknown as T;
    }
    if (method === "PUT") {
      authedUid();
      return updateProfile(body as Partial<import("@/types").UserProfile>) as unknown as T;
    }
  }

  // --- DASHBOARD ---
  if (path === "/dashboard/summary" && method === "GET") {
    authedUid();
    const months = Number(query.get("months") || "6");
    const owner = query.get("owner_type") as OwnerType | null;
    return computeSummary({ months, ownerType: owner || undefined }) as unknown as T;
  }

  // --- DATA: EXPORT / IMPORT / WIPE ---
  if (path === "/data/export" && method === "GET") {
    const uid = authedUid();
    const profile = currentProfile();
    const data = rawUserData();
    const out = {
      schema_version: 1,
      exported_at: nowIso(),
      user: { uid, email: profile?.email, display_name: profile?.display_name },
      ...data,
    };
    return out as unknown as T;
  }
  if (path === "/data/import" && method === "POST") {
    authedUid();
    const counts = replaceUserData((body as Partial<UserData>) || {});
    return { imported: counts, replaced: true } as unknown as T;
  }
  if (path === "/data/wipe" && method === "DELETE") {
    authedUid();
    wipeUserData();
    return undefined as unknown as T;
  }

  // --- COLEÇÕES GENÉRICAS ---
  const collMatch = path.match(/^\/(transactions|categories|investments|payments|accounts|goals)(?:\/([^/]+)(?:\/(\w+))?)?$/);
  if (collMatch) {
    const collection = collMatch[1] as keyof UserData;
    const docId = collMatch[2];
    const subAction = collMatch[3];

    authedUid();

    // payments/{id}/pay
    if (collection === "payments" && docId && subAction === "pay" && method === "POST") {
      const updated = repo.update(collection, docId, { status: "paid" as PaymentStatus, paid_at: nowIso() });
      if (!updated) throw new ApiError(404, "Pagamento não encontrado");
      return updated as unknown as T;
    }

    if (!docId) {
      if (method === "GET") {
        const opts: ListOptions = {};
        if (collection === "transactions") {
          opts.filters = buildTxFilters(query);
          opts.orderBy = "occurred_at";
          opts.desc = true;
          opts.limit = Number(query.get("limit") || "500");
        } else if (collection === "payments") {
          opts.orderBy = "due_date";
          opts.desc = false;
        } else if (collection === "investments") {
          opts.orderBy = "purchase_date";
          opts.desc = true;
        } else if (collection === "categories" || collection === "accounts") {
          opts.orderBy = "name";
          opts.desc = false;
        } else if (collection === "goals") {
          opts.orderBy = "created_at";
          opts.desc = true;
        }
        return repo.list(collection, opts) as unknown as T;
      }
      if (method === "POST") {
        return repo.create(collection, (body as Record<string, unknown>) || {}) as unknown as T;
      }
    } else {
      if (method === "GET") {
        const item = repo.get(collection, docId);
        if (!item) throw new ApiError(404, `${collection} não encontrado`);
        return item as unknown as T;
      }
      if (method === "PUT") {
        const updated = repo.update(collection, docId, (body as Record<string, unknown>) || {});
        if (!updated) throw new ApiError(404, `${collection} não encontrado`);
        return updated as unknown as T;
      }
      if (method === "DELETE") {
        const ok = repo.remove(collection, docId);
        if (!ok) throw new ApiError(404, `${collection} não encontrado`);
        return undefined as unknown as T;
      }
    }
  }

  notFound(method, path);
}
