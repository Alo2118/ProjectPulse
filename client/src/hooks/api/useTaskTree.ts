import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const KEYS = {
  all: ['taskTree'] as const,
  tree: (filters: Record<string, unknown>) => [...KEYS.all, filters] as const,
}

export function useTaskTreeQuery(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: KEYS.tree(filters),
    queryFn: async () => {
      const { data } = await api.get('/task-tree', { params: filters })
      return data.data
    },
  })
}

export { KEYS as taskTreeKeys }
