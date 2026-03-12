import { create } from 'zustand'

interface SelectionState {
  selectedIds: Set<string>
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
  isSelected: (id: string) => boolean
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),
  toggle: (id) => set((s) => {
    const next = new Set(s.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { selectedIds: next }
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set() }),
  isSelected: (id) => get().selectedIds.has(id),
}))
