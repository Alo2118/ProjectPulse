import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['search'] as const,
  query: (q: string) => [...KEYS.all, q] as const,
}

export function useSearchQuery(q: string) {
  return useQuery({
    queryKey: KEYS.query(q),
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q } })
      return data.data
    },
    enabled: q.length >= 2,
  })
}

export { KEYS as searchKeys }
