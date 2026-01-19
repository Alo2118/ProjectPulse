import { useState, useCallback } from 'react';
import { requestsApi } from '../services/api';

export const usePendingRequestsCount = () => {
  const [pendingCount, setPendingCount] = useState(0);

  const refetchCount = useCallback(async () => {
    try {
      const statsRes = await requestsApi.getStats();
      const byStatus = statsRes.data?.byStatus || [];
      const newRequests = byStatus?.find((s) => s.status === 'new');
      setPendingCount(newRequests?.count || 0);
    } catch (error) {
      console.error('Errore caricamento conteggio richieste:', error);
    }
  }, []);

  const incrementCount = useCallback(() => {
    setPendingCount((prev) => prev + 1);
  }, []);

  const decrementCount = useCallback(() => {
    setPendingCount((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    pendingCount,
    setPendingCount,
    refetchCount,
    incrementCount,
    decrementCount,
  };
};
