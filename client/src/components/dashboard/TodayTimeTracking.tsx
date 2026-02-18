/**
 * TodayTimeTracking - Shows today's time entries with live running timer
 * @module components/dashboard/TodayTimeTracking
 */

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Square, ArrowRight, Play, Pause } from 'lucide-react'
import { LiveTimer } from '@/components/ui/LiveTimer'
import { useDashboardStore } from '@stores/dashboardStore'
import api from '@services/api'
import { TimeEntry } from '@/types'

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Live total that updates every second when a timer is running */
function LiveTotal({ baseMinutes, runningStartTime }: { baseMinutes: number; runningStartTime: string | null }) {
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    if (!runningStartTime) {
      setExtra(0)
      return
    }
    const start = new Date(runningStartTime).getTime()
    const tick = () => setExtra(Math.floor((Date.now() - start) / 60000))
    tick()
    const interval = setInterval(tick, 10000) // update every 10s for the total
    return () => clearInterval(interval)
  }, [runningStartTime])

  const total = baseMinutes + extra
  const h = Math.floor(total / 60)
  const m = total % 60

  return (
    <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">
      {h > 0 && <>{h}<span className="text-gray-400 text-sm">h </span></>}
      {m}<span className="text-gray-400 text-sm">m</span>
    </span>
  )
}

interface TodayTimeTrackingProps {
  onTimerToggle: (taskId: string) => void
}

export function TodayTimeTracking({ onTimerToggle }: TodayTimeTrackingProps) {
  const { runningTimer } = useDashboardStore()
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTodayEntries = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await api.get<{ success: boolean; data: TimeEntry[] }>(
        `/time-entries?fromDate=${today}&limit=50`
      )
      if (response.data.success !== false) {
        const todayStart = new Date(today).getTime()
        const entries = (response.data.data || []).filter(
          (e) => new Date(e.startTime).getTime() >= todayStart && !e.isRunning
        )
        setTodayEntries(entries)
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayEntries()
  }, [fetchTodayEntries])

  // Refetch when timer stops (runningTimer goes from something to null)
  useEffect(() => {
    if (!runningTimer) {
      fetchTodayEntries()
    }
  }, [runningTimer, fetchTodayEntries])

  const completedMinutes = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
  const entryCount = todayEntries.length + (runningTimer ? 1 : 0)

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" />
          Tempo Oggi
          {entryCount > 0 && (
            <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {entryCount} {entryCount === 1 ? 'voce' : 'voci'}
            </span>
          )}
        </h2>
        <LiveTotal baseMinutes={completedMinutes} runningStartTime={runningTimer?.startTime ?? null} />
      </div>

      <div className="p-4">
        {/* Running Timer (highlighted) */}
        {runningTimer && (
          <div className="mb-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/tasks/${runningTimer.taskId}`}
                  className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block"
                >
                  {runningTimer.task?.title || 'Timer attivo'}
                </Link>
                {runningTimer.task?.project && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {runningTimer.task.project.name} &middot; {runningTimer.task.code}
                  </p>
                )}
              </div>
              <LiveTimer startTime={runningTimer.startTime} size="sm" className="text-primary-600 dark:text-primary-400" />
              <button
                onClick={() => onTimerToggle(runningTimer.taskId)}
                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
                title="Stop timer"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Today's completed entries */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="skeleton w-3 h-3 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
                <div className="skeleton h-4 w-12" />
              </div>
            ))}
          </div>
        ) : todayEntries.length === 0 && !runningTimer ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <Pause className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessuna registrazione oggi</p>
            <Link
              to="/tasks"
              className="text-xs text-primary-500 hover:text-primary-600 mt-1 inline-flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Avvia un timer da un task
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {todayEntries.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/tasks/${entry.taskId}`}
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 truncate block"
                  >
                    {entry.task?.title || entry.description || 'Time entry'}
                  </Link>
                  {entry.task?.project && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {entry.task.project.name} &middot; {entry.task.code}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDuration(entry.duration || 0)}
                </span>
              </div>
            ))}
            {todayEntries.length > 6 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                ...e altre {todayEntries.length - 6} registrazioni
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
        <Link
          to="/time-tracking"
          className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 flex items-center justify-center gap-1 group"
        >
          Vedi tutto il registro ore
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
