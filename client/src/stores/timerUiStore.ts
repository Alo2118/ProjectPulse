import { create } from 'zustand'

interface TimerUIState {
  runningEntryId: string | null
  taskId: string | null
  startedAt: string | null
  setRunning: (entryId: string | null, taskId: string | null, startedAt: string | null) => void
  clear: () => void
}

export const useTimerUIStore = create<TimerUIState>((set) => ({
  runningEntryId: null,
  taskId: null,
  startedAt: null,
  setRunning: (runningEntryId, taskId, startedAt) => set({ runningEntryId, taskId, startedAt }),
  clear: () => set({ runningEntryId: null, taskId: null, startedAt: null }),
}))
