import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SISTEMA DI CACHING API - ProjectPulse
 *
 * Features:
 * - Cache in-memory con TTL configurabile
 * - Deduplication automatica delle richieste
 * - Invalidazione selettiva
 * - Optimistic updates
 * - Stale-while-revalidate pattern
 *
 * @example
 * const { data, loading, error, refetch, mutate } = useApiCache(
 *   'tasks-user-123',
 *   () => tasksApi.getAll({ assigned_to: 123 }),
 *   { staleTime: 5 * 60 * 1000 } // 5 minuti
 * );
 */

// Cache globale in-memory
const cache = new Map();
const pendingRequests = new Map();

// Configurazione default
const DEFAULT_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minuti
  cacheTime: 10 * 60 * 1000, // 10 minuti
  retry: 1,
  retryDelay: 1000,
  dedupe: true, // Deduplica richieste identiche
};

/**
 * Custom hook per API con caching
 */
export function useApiCache(key, fetcher, config = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Controlla se i dati in cache sono ancora fresh
   */
  const isCacheFresh = useCallback(() => {
    const cached = cache.get(key);
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < options.staleTime;
  }, [key, options.staleTime]);

  /**
   * Ottieni dati dalla cache
   */
  const getCachedData = useCallback(() => {
    const cached = cache.get(key);
    return cached?.data || null;
  }, [key]);

  /**
   * Salva in cache
   */
  const setCacheData = useCallback((newData) => {
    cache.set(key, {
      data: newData,
      timestamp: Date.now(),
    });

    // Cleanup automatico dopo cacheTime
    setTimeout(() => {
      if (cache.has(key)) {
        const cached = cache.get(key);
        const age = Date.now() - cached.timestamp;
        if (age >= options.cacheTime) {
          cache.delete(key);
        }
      }
    }, options.cacheTime);
  }, [key, options.cacheTime]);

  /**
   * Fetch data con retry logic
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Se non forza il refresh e cache è fresh, usa cache
    if (!forceRefresh && isCacheFresh()) {
      const cachedData = getCachedData();
      if (cachedData && mountedRef.current) {
        setData(cachedData);
        setLoading(false);
        return cachedData;
      }
    }

    // Deduplication: se c'è già una richiesta in corso per questa key
    if (options.dedupe && pendingRequests.has(key)) {
      try {
        return await pendingRequests.get(key);
      } catch (err) {
        throw err;
      }
    }

    // Crea nuova promise
    const fetchPromise = (async () => {
      try {
        if (mountedRef.current) setLoading(true);

        const response = await fetcher();
        const newData = response.data;

        // Salva in cache
        setCacheData(newData);

        if (mountedRef.current) {
          setData(newData);
          setError(null);
          setLoading(false);
          retryCountRef.current = 0;
        }

        return newData;
      } catch (err) {
        // Retry logic
        if (retryCountRef.current < options.retry) {
          retryCountRef.current++;
          await new Promise((resolve) =>
            setTimeout(resolve, options.retryDelay * retryCountRef.current)
          );
          return fetchData(forceRefresh);
        }

        if (mountedRef.current) {
          setError(err);
          setLoading(false);
        }

        throw err;
      } finally {
        pendingRequests.delete(key);
      }
    })();

    if (options.dedupe) {
      pendingRequests.set(key, fetchPromise);
    }

    return fetchPromise;
  }, [key, fetcher, isCacheFresh, getCachedData, setCacheData, options]);

  /**
   * Refetch manuale (bypass cache)
   */
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  /**
   * Optimistic update
   * Aggiorna immediatamente lo stato locale, poi fa il fetch
   */
  const mutate = useCallback(
    async (updater, shouldRefetch = true) => {
      const currentData = data || getCachedData();

      // Update ottimistico
      const optimisticData =
        typeof updater === 'function' ? updater(currentData) : updater;

      setData(optimisticData);
      setCacheData(optimisticData);

      // Refetch per confermare
      if (shouldRefetch) {
        try {
          await fetchData(true);
        } catch (err) {
          // Rollback in caso di errore
          setData(currentData);
          setCacheData(currentData);
          throw err;
        }
      }

      return optimisticData;
    },
    [data, getCachedData, setCacheData, fetchData]
  );

  // Fetch iniziale
  useEffect(() => {
    // Stale-while-revalidate: mostra cache mentre ricarica
    const cachedData = getCachedData();
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
    }

    fetchData();
  }, [key]); // Solo quando cambia la key

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
    isFresh: isCacheFresh(),
  };
}

/**
 * Invalidate cache per una specifica key o pattern
 */
export function invalidateCache(keyOrPattern) {
  if (typeof keyOrPattern === 'string') {
    cache.delete(keyOrPattern);
  } else if (keyOrPattern instanceof RegExp) {
    // Invalida tutte le key che matchano il pattern
    for (const key of cache.keys()) {
      if (keyOrPattern.test(key)) {
        cache.delete(key);
      }
    }
  }
}

/**
 * Invalida tutte le cache
 */
export function invalidateAllCache() {
  cache.clear();
  pendingRequests.clear();
}

/**
 * Prefetch data (carica in cache senza mostrare)
 */
export async function prefetchData(key, fetcher, config = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };

  // Se già in cache e fresh, skip
  const cached = cache.get(key);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < options.staleTime) {
      return cached.data;
    }
  }

  // Fetch e salva in cache
  try {
    const response = await fetcher();
    const data = response.data;

    cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (err) {
    console.error('Prefetch failed:', err);
    return null;
  }
}

/**
 * Hook per mutazioni (create, update, delete)
 * Invalida automaticamente cache correlate
 */
export function useApiMutation(mutationFn, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (variables) => {
      setLoading(true);
      setError(null);

      try {
        const response = await mutationFn(variables);
        const data = response.data;

        // Invalida cache se specificato
        if (options.invalidate) {
          if (Array.isArray(options.invalidate)) {
            options.invalidate.forEach((key) => invalidateCache(key));
          } else {
            invalidateCache(options.invalidate);
          }
        }

        // Callback di successo
        if (options.onSuccess) {
          options.onSuccess(data, variables);
        }

        setLoading(false);
        return data;
      } catch (err) {
        setError(err);

        // Callback di errore
        if (options.onError) {
          options.onError(err, variables);
        }

        setLoading(false);
        throw err;
      }
    },
    [mutationFn, options]
  );

  return {
    mutate,
    loading,
    error,
  };
}

export default useApiCache;
