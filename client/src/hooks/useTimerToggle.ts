/**
 * useTimerToggle - Shared timer start/stop logic across pages
 * @module hooks/useTimerToggle
 */

import { useCallback } from 'react'
import { useDashboardStore } from '@stores/dashboardStore'
import { useAuthStore } from '@stores/authStore'
import { TimeEntry } from '@/types'

interface UseTimerToggleReturn {
  /** The currently running time entry, or null if no timer is active */
  runningTimer: TimeEntry | null
  /** True when the current user is allowed to track time (excludes 'direzione' role) */
  canTrackTime: boolean
  /** Starts the timer for the given task, or stops it if already running on that task */
  handleTimerToggle: (taskId: string) => Promise<void>
  /** Shorthand for runningTimer?.taskId ?? null */
  runningTimerTaskId: string | null
}

export function useTimerToggle(): UseTimerToggleReturn {
  const { runningTimer, startTimer, stopTimer } = useDashboardStore()
  const { user } = useAuthStore()

  const canTrackTime = user?.role !== 'direzione'

  const handleTimerToggle = useCallback(
    async (taskId: string) => {
      try {
        if (runningTimer?.taskId === taskId) {
          await stopTimer()
        } else {
          await startTimer(taskId)
        }
      } catch {
        // Timer errors are handled silently; each page can observe
        // runningTimer state for UI feedback.
      }
    },
    [runningTimer?.taskId, startTimer, stopTimer]
  )

  return {
    runningTimer,
    canTrackTime,
    handleTimerToggle,
    runningTimerTaskId: runningTimer?.taskId ?? null,
  }
}
