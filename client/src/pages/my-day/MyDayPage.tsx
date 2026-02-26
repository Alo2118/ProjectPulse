/**
 * MyDayPage - Focused daily task view
 * Shows today's tasks, overdue items, time tracking, and tomorrow preview
 * @module pages/my-day/MyDayPage
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useTaskStore } from '@stores/taskStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { Target, AlertTriangle } from 'lucide-react'
import { MyDayHeader } from '@components/my-day/MyDayHeader'
import { MyDayTaskSection } from '@components/my-day/MyDayTaskSection'
import { MyDayTomorrowPreview } from '@components/my-day/MyDayTomorrowPreview'
import { TimerWidget } from '@components/dashboard/TimerWidget'
import { TodayTimeTracking } from '@components/dashboard/TodayTimeTracking'
import { QuickAddTask } from '@components/tasks/QuickAddTask'
import { BlockedReasonModal } from '@components/tasks/BlockedReasonModal'
import type { Task, TaskStatus } from '@/types'

// ── Date helpers ──────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  const d = startOfDay(new Date(dateString))
  const today = startOfDay(new Date())
  return d.getTime() === today.getTime()
}

function isTomorrow(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  const d = startOfDay(new Date(dateString))
  const tomorrow = startOfDay(new Date())
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.getTime() === tomorrow.getTime()
}

function isPast(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  const d = startOfDay(new Date(dateString))
  const today = startOfDay(new Date())
  return d.getTime() < today.getTime()
}

// ── Priority sort helper ─────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function sortByPriorityThenDue(a: Task, b: Task): number {
  // in_progress first
  if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
  if (a.status !== 'in_progress' && b.status === 'in_progress') return 1
  // Then by priority
  const pa = PRIORITY_ORDER[a.priority] ?? 3
  const pb = PRIORITY_ORDER[b.priority] ?? 3
  if (pa !== pb) return pa - pb
  // Then by due date (earliest first)
  if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return 0
}

// ── Skeleton ─────────────────────────────────────────────────

function MyDaySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="skeleton h-7 w-64 mb-2" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
        </div>
      </div>
      {/* Task section skeleton */}
      <div className="card">
        <div className="p-4 border-b border-cyan-500/10">
          <div className="skeleton h-6 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-5 h-5 rounded-full" />
              <div className="skeleton w-4 h-4 rounded-full" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Time tracking skeleton */}
      <div className="card">
        <div className="p-4 border-b border-cyan-500/10">
          <div className="skeleton h-6 w-32" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-3 h-3 rounded-full" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function MyDayPage() {
  const { user } = useAuthStore()
  const {
    myTasks,
    recentTimeEntries,
    isLoading,
    fetchDashboardData,
  } = useDashboardStore()
  const { changeTaskStatus, updateTask } = useTaskStore()
  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()

  // BlockedReasonModal state
  const [blockingTask, setBlockingTask] = useState<Task | null>(null)
  const [isBlockSubmitting, setIsBlockSubmitting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // ── Computed task lists ──────────────────────────────────

  const todayTasks = useMemo(() => {
    return myTasks
      .filter((t) => {
        if (t.status === 'done' || t.status === 'cancelled') return false
        if (isPast(t.dueDate)) return false // overdue goes to separate section
        return isToday(t.dueDate) || t.status === 'in_progress'
      })
      .sort(sortByPriorityThenDue)
  }, [myTasks])

  const overdueTasks = useMemo(() => {
    return myTasks
      .filter((t) => {
        if (t.status === 'done' || t.status === 'cancelled') return false
        return isPast(t.dueDate)
      })
      .sort((a, b) => {
        // Oldest overdue first
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        return 0
      })
  }, [myTasks])

  const tomorrowTasks = useMemo(() => {
    return myTasks
      .filter((t) => {
        if (t.status === 'done' || t.status === 'cancelled') return false
        return isTomorrow(t.dueDate)
      })
      .sort(sortByPriorityThenDue)
  }, [myTasks])

  const completedTodayCount = useMemo(() => {
    return myTasks.filter(
      (t) => t.status === 'done' && isToday(t.updatedAt)
    ).length
  }, [myTasks])

  const minutesLoggedToday = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime()
    return recentTimeEntries
      .filter((e) => new Date(e.startTime).getTime() >= todayStart && !e.isRunning)
      .reduce((sum, e) => sum + (e.duration ?? 0), 0)
  }, [recentTimeEntries])

  const totalTodayTasks = todayTasks.length + overdueTasks.length

  // ── Handlers ────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (task: Task, newStatus: TaskStatus) => {
      if (newStatus === 'blocked') {
        setBlockingTask(task)
        return
      }
      await changeTaskStatus(task.id, newStatus)
      fetchDashboardData()
    },
    [changeTaskStatus, fetchDashboardData]
  )

  const handleBlockConfirm = useCallback(
    async (reason: string) => {
      if (!blockingTask) return
      setIsBlockSubmitting(true)
      try {
        await changeTaskStatus(blockingTask.id, 'blocked', reason)
        setBlockingTask(null)
        fetchDashboardData()
      } finally {
        setIsBlockSubmitting(false)
      }
    },
    [blockingTask, changeTaskStatus, fetchDashboardData]
  )

  const handlePriorityChange = useCallback(
    async (task: Task, newPriority: string) => {
      await updateTask(task.id, { priority: newPriority as Task['priority'] })
      fetchDashboardData()
    },
    [updateTask, fetchDashboardData]
  )

  const handleTaskCreated = useCallback(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // ── Render ──────────────────────────────────────────────

  if (isLoading && myTasks.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <MyDaySkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <MyDayHeader
        userName={user?.firstName ?? 'Utente'}
        completedToday={completedTodayCount}
        totalToday={totalTodayTasks + completedTodayCount}
        minutesLoggedToday={minutesLoggedToday}
      />

      {/* Running timer */}
      <TimerWidget onTimerToggle={handleTimerToggle} />

      {/* Overdue tasks (danger section, shown first if any) */}
      {overdueTasks.length > 0 && (
        <MyDayTaskSection
          title="Scaduti"
          icon={AlertTriangle}
          tasks={overdueTasks}
          variant="danger"
          emptyMessage=""
          emptyIcon={AlertTriangle}
          canTrackTime={canTrackTime}
          runningTimerTaskId={runningTimerTaskId}
          onTimerToggle={handleTimerToggle}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}

      {/* Focus today */}
      <MyDayTaskSection
        title="Focus Oggi"
        icon={Target}
        tasks={todayTasks}
        variant="default"
        emptyMessage="Nessun task per oggi. Aggiungine uno qui sotto!"
        emptyIcon={Target}
        canTrackTime={canTrackTime}
        runningTimerTaskId={runningTimerTaskId}
        onTimerToggle={handleTimerToggle}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
      />

      {/* Time tracking */}
      <TodayTimeTracking onTimerToggle={handleTimerToggle} />

      {/* Quick add */}
      <div className="card">
        <QuickAddTask onCreated={handleTaskCreated} />
      </div>

      {/* Tomorrow preview */}
      {tomorrowTasks.length > 0 && (
        <MyDayTomorrowPreview tasks={tomorrowTasks} />
      )}

      {/* Blocked reason modal */}
      <BlockedReasonModal
        isOpen={blockingTask !== null}
        taskTitle={blockingTask?.title ?? ''}
        isSubmitting={isBlockSubmitting}
        onCancel={() => setBlockingTask(null)}
        onConfirm={handleBlockConfirm}
      />
    </div>
  )
}
