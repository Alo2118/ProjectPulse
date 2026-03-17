import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SearchDomain = 'all' | 'tasks' | 'projects' | 'users' | 'risks' | 'documents'

const KEYS = {
  all: ['search'] as const,
  query: (q: string, domain: SearchDomain = 'all') => [...KEYS.all, q, domain] as const,
}

export function useSearchQuery(q: string, domain: SearchDomain = 'all') {
  return useQuery({
    queryKey: KEYS.query(q, domain),
    queryFn: async () => {
      const { data } = await api.get('/search', { params: { q, domain } })
      return data.data
    },
    enabled: q.length >= 2,
  })
}

export { KEYS as searchKeys }
