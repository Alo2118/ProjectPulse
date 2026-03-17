import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationUIState {
  soundEnabled: boolean
  desktopEnabled: boolean
  panelOpen: boolean
  toggleSound: () => void
  toggleDesktop: () => void
  setPanelOpen: (open: boolean) => void
}

export const useNotificationUIStore = create<NotificationUIState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      desktopEnabled: false,
      panelOpen: false,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleDesktop: () => set((s) => ({ desktopEnabled: !s.desktopEnabled })),
      setPanelOpen: (open) => set({ panelOpen: open }),
    }),
    { name: 'pp-notif-prefs', partialize: (s) => ({ soundEnabled: s.soundEnabled, desktopEnabled: s.desktopEnabled }) }
  )
)
