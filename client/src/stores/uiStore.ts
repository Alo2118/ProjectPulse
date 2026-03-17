import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentSearch {
  query: string
  timestamp: number
}

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  recentSearches: RecentSearch[]
  toggleSidebar: () => void
  setMobileSidebar: (open: boolean) => void
  setCommandPalette: (open: boolean) => void
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      commandPaletteOpen: false,
      recentSearches: [],
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
      setCommandPalette: (open) => set({ commandPaletteOpen: open }),
      addRecentSearch: (query) =>
        set((s) => {
          const filtered = s.recentSearches.filter((r) => r.query !== query)
          const updated = [{ query, timestamp: Date.now() }, ...filtered].slice(0, 10)
          return { recentSearches: updated }
        }),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'pp-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        recentSearches: state.recentSearches,
      }),
    }
  )
)
