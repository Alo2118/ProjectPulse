import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  toggleSidebar: () => void
  setMobileSidebar: (open: boolean) => void
  setCommandPalette: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
}))
