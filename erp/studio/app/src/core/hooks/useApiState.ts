import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for API-backed state with CRUD operations.
 * Replaces usePersistedState with real backend data.
 */
export function useApiState<T extends { id: string }>(
  listFn: () => Promise<T[]>,
  createFn?: (data: Partial<T>) => Promise<T>,
  updateFn?: (id: string, data: Partial<T>) => Promise<T>,
  deleteFn?: (id: string) => Promise<void>
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listFn();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(async (data: Partial<T>): Promise<T | null> => {
    if (!createFn) return null;
    try {
      const created = await createFn(data);
      setItems(prev => [created, ...prev]);
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      return null;
    }
  }, [createFn]);

  const update = useCallback(async (id: string, data: Partial<T>): Promise<T | null> => {
    if (!updateFn) return null;
    try {
      const updated = await updateFn(id, data);
      setItems(prev => prev.map(item => item.id === id ? updated : item));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      return null;
    }
  }, [updateFn]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!deleteFn) return false;
    try {
      await deleteFn(id);
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      return false;
    }
  }, [deleteFn]);

  return { items, setItems, loading, error, load, add, update, remove };
}
