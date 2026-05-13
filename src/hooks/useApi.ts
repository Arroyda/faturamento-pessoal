import { useCallback, useEffect, useState } from "react";
import { api, apiError } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export function useApiResource<T>(path: string, deps: unknown[] = []) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<T>(path);
      setData(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, user, ...deps]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}
