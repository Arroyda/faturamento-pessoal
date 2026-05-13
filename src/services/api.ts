/**
 * Facade que mimica a interface do axios usada nas páginas, mas resolve
 * tudo localmente (sem rede). Mantém pages/hooks inalterados.
 */

import { ApiError, route } from "@/store/router";

interface Response<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

function wrap<T>(data: T): Response<T> {
  return { data, status: 200, headers: {} };
}

export const api = {
  defaults: { baseURL: "local://" },

  async get<T>(path: string): Promise<Response<T>> {
    return wrap(await route<T>("GET", path));
  },
  async post<T>(path: string, body?: unknown): Promise<Response<T>> {
    return wrap(await route<T>("POST", path, body));
  },
  async put<T>(path: string, body?: unknown): Promise<Response<T>> {
    return wrap(await route<T>("PUT", path, body));
  },
  async delete<T>(path: string): Promise<Response<T>> {
    return wrap(await route<T>("DELETE", path));
  },
};

export function apiError(error: unknown): string {
  if (error instanceof ApiError) return error.detail;
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
}
