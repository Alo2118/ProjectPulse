import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: ToastAction
  /** When true, renders a shrinking progress bar over `duration` ms */
  showProgress?: boolean
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

// Fallback UUID generator for browsers that don't support crypto.randomUUID
const generateUUID = (): string => {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toastData) => {
    const id = generateUUID()
    set((state) => ({
      toasts: [...state.toasts, { ...toastData, id }],
    }))
    return id
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

// ---------------------------------------------------------------------------
// Pending-delete registry
// Tracks undo toasts whose API calls have not yet been committed.
// Used to flush all pending deletes immediately when the user navigates away.
// ---------------------------------------------------------------------------
interface PendingDelete {
  /** Calls the actual API delete and resolves when done (may throw). */
  commit: () => Promise<void>
  /** Cancels the pending delete (user clicked Annulla). */
  cancel: () => void
}

const pendingDeletes = new Map<string, PendingDelete>()

/**
 * Flushes all pending deletes immediately (fire-and-forget).
 * Call this when the user navigates away from the app or the component unmounts.
 */
export function flushPendingDeletes(): void {
  for (const [, entry] of pendingDeletes) {
    entry.commit().catch(() => {
      // Best-effort — nothing we can do if the user has already navigated away
    })
  }
  pendingDeletes.clear()
}

/** Shorthand helper */
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'warning', title, message }),

  /**
   * Shows a toast with an "Annulla" button for 5 seconds.
   *
   * Workflow:
   * 1. Caller should optimistically remove the item from UI BEFORE calling this.
   * 2. If the user does NOT click "Annulla" within 5 s → onConfirm() is called (API delete).
   * 3. If the user clicks "Annulla" → onUndo() is called (restore item in local state).
   * 4. If the user navigates away → flushPendingDeletes() commits all pending deletes.
   */
  withUndo: (
    title: string,
    onConfirm: () => Promise<void>,
    onUndo?: () => void,
    message?: string
  ): void => {
    const DURATION = 5000
    const { addToast, removeToast } = useToastStore.getState()

    let timerHandle: ReturnType<typeof setTimeout> | null = null
    let committed = false

    const pendingId = generateUUID()

    const commit = (): Promise<void> => {
      if (committed) return Promise.resolve()
      committed = true
      pendingDeletes.delete(pendingId)
      return onConfirm().catch(() => {
        useToastStore.getState().addToast({
          type: 'error',
          title: 'Errore',
          message: "Impossibile completare l'operazione",
        })
      })
    }

    const cancel = () => {
      if (committed) return
      committed = true
      pendingDeletes.delete(pendingId)
      if (timerHandle !== null) {
        clearTimeout(timerHandle)
        timerHandle = null
      }
    }

    const handleUndo = () => {
      cancel()
      removeToast(toastId)
      if (onUndo) onUndo()
    }

    const toastId = addToast({
      type: 'warning',
      title,
      message,
      duration: DURATION,
      showProgress: true,
      action: {
        label: 'Annulla',
        onClick: handleUndo,
      },
    })

    // Register in the global pending map so flushPendingDeletes() can reach it
    pendingDeletes.set(pendingId, { commit, cancel })

    timerHandle = setTimeout(() => {
      timerHandle = null
      removeToast(toastId)
      void commit()
    }, DURATION)
  },
}
