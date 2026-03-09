/**
 * MyDayPage - Focused daily task view
 * Layout order: Alerts → Timer → Stats → Focus → QuickAdd → Tempo → Domani
 * @module pages/my-day/MyDayPage
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useTaskStore } from '@stores/taskStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { Target, AlertTriangle, Timer, CalendarDays, Plus, Zap } from 'lucide-react'
import { MyDayHeader } from '@components/my-day/MyDayHeader'
import { MyDayTaskSection } from '@components/my-day/MyDayTaskSection'
import { MyDayTomorrowPreview } from '@components/my-day/MyDayTomorrowPreview'
import { TodayTimeTracking } from '@components/dashboard/TodayTimeTracking'
import { BlockedReasonModal } from '@components/tasks/BlockedReasonModal'
import { HudTimerDisplay, HudAlertBanner, HudSectionPanel } from '@components/ui/hud'
import type { Task, TaskStatus } from '@/types'

// ── localStorage key for persisted state ────────────────────────

const LS_TIMER_SECTION_KEY = 'myday_timer_section_visible'

// ── Date helpers ────────────────────────────────────────────────

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

// ── Priority sort helper ─────────────────────────────────────────

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

// ── Blocked task counts ───────────────────────────────────────────

function countBlocked(tasks: Task[]): number {
  return tasks.filter((t) => t.status === 'blocked').length
}

// ── Loading skeleton ─────────────────────────────────────────────

function MyDaySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2.5">
        <div>
          <div className="skeleton h-6 w-56 mb-1" />
          <div className="skeleton h-3.5 w-36" />
        </div>
        <div className="flex gap-1.5">
          <div className="skeleton h-11 w-28 rounded-lg" />
          <div className="skeleton h-11 w-28 rounded-lg" />
        </div>
      </div>
      {/* Task section skeleton */}
      <div className="card">
        <div className="px-4 py-3 border-b border-[var(--border-default)]">
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="skeleton w-[22px] h-[22px] rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3.5 w-3/4" />
                <div className="skeleton h-2.5 w-1/3" />
              </div>
              <div className="skeleton h-4 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Time tracking skeleton */}
      <div className="card">
        <div className="px-4 py-3 border-b border-[var(--border-default)]">
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="p-4 flex justify-center">
          <div className="skeleton w-[90px] h-[90px] rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ── Section fade animation variants ─────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
}

// ── Main Page ────────────────────────────────────────────────────

export default function MyDayPage() {
  const { user } = useAuthStore()
  const {
    myTasks,
    recentTimeEntries,
    runningTimer,
    isLoading,
    fetchDashboardData,
  } = useDashboardStore()
  const { changeTaskStatus, updateTask } = useTaskStore()
  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()

  // BlockedReasonModal state
  const [blockingTask, setBlockingTask] = useState<Task | null>(null)
  const [isBlockSubmitting, setIsBlockSubmitting] = useState(false)

  // Timer section visibility: show when timer running, or user explicitly opens it
  const [timerSectionVisible, setTimerSectionVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_TIMER_SECTION_KEY) !== 'false'
    } catch {
      return true
    }
  })

  // Persist timer section visibility
  const setTimerVisible = useCallback((visible: boolean) => {
    setTimerSectionVisible(visible)
    try {
      localStorage.setItem(LS_TIMER_SECTION_KEY, String(visible))
    } catch {
      // ignore storage errors
    }
  }, [])

  // Counter-based trigger for quick-add focus (incremented on keyboard shortcut N)
  const [quickAddActivationCount, setQuickAddActivationCount] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement
      // Skip if focus is in an input / textarea / select
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        // Trigger QuickAddTask focus via counter increment
        e.preventDefault()
        setQuickAddActivationCount((c) => c + 1)
      }

      if (e.key === 't' || e.key === 'T') {
        // Toggle timer section visibility
        e.preventDefault()
        setTimerVisible(!timerSectionVisible)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [timerSectionVisible, setTimerVisible])

  // ── Computed task lists ────────────────────────────────────────

  const todayTasks = useMemo(() => {
    return myTasks
      .filter((t) => {
        if (t.status === 'done' || t.status === 'cancelled') return false
        if (isPast(t.dueDate)) return false // overdue goes to its own section
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

  const blockedCount = useMemo(() => countBlocked([...todayTasks, ...overdueTasks]), [todayTasks, overdueTasks])

  const totalTodayTasks = todayTasks.length + overdueTasks.length

  // Whether to show the timer section independently of running state
  const showTimerSection = timerSectionVisible || !!runningTimer

  // ── Handlers ──────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────

  if (isLoading && myTasks.length === 0) {
    return (
      <div className="space-y-5">
        <MyDaySkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── 1. Header: greeting + stat badges ── */}
      <MyDayHeader
        userName={user?.firstName ?? 'Utente'}
        completedToday={completedTodayCount}
        totalToday={totalTodayTasks + completedTodayCount}
        minutesLoggedToday={minutesLoggedToday}
        overdueCount={overdueTasks.length}
      />

      {/* ── 2. Alert bloccati (overdue alert removed: already shown via header badge + section) ── */}
      <AnimatePresence>
        {blockedCount > 0 && (
          <motion.div
            key="alert-blocked"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <HudAlertBanner
              severity="warning"
              title={`${blockedCount} ${blockedCount === 1 ? 'task bloccato' : 'task bloccati'}`}
              subtitle="Rimuovi i blocchi per continuare"
              count={blockedCount}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. Timer attivo ── */}
      <AnimatePresence>
        {showTimerSection && (
          <motion.div
            key="timer-section"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <HudSectionPanel
              title="Timer Attivo"
              icon={Timer}
              action={
                !runningTimer ? (
                  <button
                    onClick={() => setTimerVisible(false)}
                    className="text-xs text-themed-tertiary hover:text-themed-secondary transition-colors px-1.5 py-0.5 rounded"
                    title="Nascondi sezione timer (T)"
                    aria-label="Nascondi sezione timer"
                  >
                    Nascondi
                  </button>
                ) : undefined
              }
            >
              <div className="p-3">
                <HudTimerDisplay
                  startTime={runningTimer?.startTime ?? null}
                  taskId={runningTimer?.taskId}
                  taskTitle={runningTimer?.task?.title}
                  projectName={runningTimer?.task?.project?.name}
                  onStop={runningTimer ? () => handleTimerToggle(runningTimer.taskId) : undefined}
                  variant="full"
                />
              </div>
            </HudSectionPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show timer toggle button when section is hidden and timer not running */}
      {!showTimerSection && !runningTimer && (
        <button
          onClick={() => setTimerVisible(true)}
          className="flex items-center gap-1.5 text-xs text-themed-tertiary hover:text-themed-secondary transition-colors"
          title="Mostra sezione timer (T)"
          aria-label="Mostra sezione timer"
        >
          <Timer className="w-3 h-3" />
          Mostra timer
        </button>
      )}

      {/* ── 4. Scaduti (shown when overdue tasks exist) ── */}
      <AnimatePresence>
        {overdueTasks.length > 0 && (
          <motion.div
            key="overdue-section"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
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
              hideOverdueBadge
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. Focus Oggi (main task list + quick add embedded) ── */}
      <MyDayTaskSection
        title="Focus Oggi"
        icon={Target}
        tasks={todayTasks}
        variant="default"
        emptyMessage="Nessun task per oggi"
        emptyIcon={Target}
        canTrackTime={canTrackTime}
        runningTimerTaskId={runningTimerTaskId}
        onTimerToggle={handleTimerToggle}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        showQuickAdd
        onTaskCreated={handleTaskCreated}
        quickAddActivationCount={quickAddActivationCount}
      />

      {/* ── 7. Tempo oggi ── */}
      <TodayTimeTracking />

      {/* ── 8. Domani (collapsible, collapsed when today has tasks) ── */}
      <AnimatePresence>
        {tomorrowTasks.length > 0 && (
          <motion.div
            key="tomorrow-section"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <MyDayTomorrowPreview
              tasks={tomorrowTasks}
              defaultCollapsed={todayTasks.length > 0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state when truly nothing for today and tomorrow ── */}
      <AnimatePresence>
        {!isLoading &&
          todayTasks.length === 0 &&
          overdueTasks.length === 0 &&
          tomorrowTasks.length === 0 && (
            <motion.div
              key="empty-all"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <HudSectionPanel title="Tutto in ordine" icon={Zap} variant="accent">
                <div className="px-4 py-6 text-center text-themed-tertiary">
                  <div className="flex justify-center mb-3">
                    <div className="relative">
                      <CalendarDays className="w-10 h-10 opacity-15" />
                      <Plus className="w-4 h-4 absolute -bottom-0.5 -right-0.5 text-themed-accent opacity-50" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-themed-secondary mb-0.5">
                    Nessun task per oggi o domani
                  </p>
                  <p className="text-xs mb-3 text-themed-tertiary">
                    Ottimo lavoro! Aggiungi nuovi task o vai alla lista completa.
                  </p>
                  <a
                    href="/tasks"
                    className="inline-flex items-center gap-1.5 text-sm text-themed-accent hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Vai ai task
                  </a>
                </div>
              </HudSectionPanel>
            </motion.div>
          )}
      </AnimatePresence>

      {/* ── Keyboard shortcut hint ── */}
      <div className="flex items-center gap-4 text-xs text-themed-tertiary opacity-40 select-none pt-1">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-default)] font-mono">N</kbd>
          nuovo task
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-default)] font-mono">T</kbd>
          timer
        </span>
      </div>

      {/* ── Blocked reason modal ── */}
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
