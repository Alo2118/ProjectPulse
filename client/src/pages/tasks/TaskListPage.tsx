/**
 * Task List Page - Shows all tasks with hierarchical view
 * Supports list, tree, table, kanban, gantt, and calendar view modes.
 * View mode is synced to ?view= URL query param.
 * @module pages/tasks/TaskListPage
 */

import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@stores/toastStore'
import { useTaskStore } from '@stores/taskStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useDepartmentStore } from '@stores/departmentStore'
import { useUserStore } from '@stores/userStore'
import { QuickAddTask } from '@components/tasks/QuickAddTask'
import { BlockedReasonModal } from '@/components/tasks/BlockedReasonModal'
import { TaskListViewFilters } from '@components/tasks/TaskListViewFilters'
import type { ViewMode } from '@components/tasks/TaskListViewFilters'
import { TaskListViewItem } from '@components/tasks/TaskListViewItem'
import { TaskBulkActionBar } from '@components/tasks/TaskBulkActionBar'
import { AdvancedFilterBuilder } from '@components/features/AdvancedFilterBuilder'
import { SavedViewsBar } from '@components/features/SavedViewsBar'
import { ExportButton } from '@components/features/ExportButton'
import { EmptyState } from '@components/common/EmptyState'
import { DeleteConfirmModal } from '@components/ui/DeleteConfirmModal'
import { useDebounce } from '@hooks/useDebounce'
import { applyAdvancedFilter, describeAdvancedFilter } from '@utils/advancedFilterUtils'
import type { Task, TaskStatus, AdvancedFilter } from '@/types'
import {
  Plus,
  CheckSquare,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { TaskTreeView } from '@/components/reports/TaskTreeView'
import TaskTableView from '@pages/tasks/TaskTableView'

// Lazy load heavy view modes to avoid bundle bloat on initial load
const KanbanBoardPage = lazy(() => import('@pages/kanban/KanbanBoardPage'))
const GanttInlineView = lazy(() => import('./GanttInlineView'))
const CalendarInlineView = lazy(() => import('./CalendarInlineView'))

/** Empty advanced filter sentinel — used for reset and initial state */
const EMPTY_ADVANCED_FILTER: AdvancedFilter = { logic: 'and', rules: [] }

/** Section status dot color */
function statusDotClass(sectionKey: string): string {
  switch (sectionKey) {
    case 'in_progress': return 'bg-blue-500'
    case 'todo': return 'bg-slate-400'
    case 'review': return 'bg-violet-500'
    case 'blocked': return 'bg-red-500'
    case 'done': return 'bg-green-500'
    case 'recurring': return 'bg-cyan-500'
    default: return 'bg-slate-400'
  }
}

/** Inline loading spinner used as Suspense fallback for lazy views */
function ViewLoader() {
  return (
    <div className="flex items-center justify-center py-16 gap-3 text-slate-500 dark:text-slate-400">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span className="text-sm">Caricamento vista...</span>
    </div>
  )
}

export default function TaskListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { tasks, myTasks, isLoading, fetchTasks, fetchMyTasks, changeTaskStatus, updateTask, bulkDeleteTasks } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()
  const { runningTimer, startTimer, stopTimer } = useDashboardStore()
  const { departments, fetchDepartments } = useDepartmentStore()
  const { users, fetchUsers } = useUserStore()

  const canTrackTime = user?.role !== 'direzione'

  // URL-synced view mode
  const viewFromUrl = searchParams.get('view') as ViewMode | null
  const [viewMode, setViewMode] = useState<ViewMode>(viewFromUrl || 'list')

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('departmentId') || '')

  // Advanced filter state
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter>(EMPTY_ADVANCED_FILTER)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [showSavedViews, setShowSavedViews] = useState(false)

  // Bulk selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Blocked reason modal state
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [pendingBlockedTaskId, setPendingBlockedTaskId] = useState<string | null>(null)
  const [pendingBlockedTaskTitle, setPendingBlockedTaskTitle] = useState('')
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // Collapsible sections — "done" collapsed by default
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['done']))

  const canSeeAllTasks = user?.role === 'admin' || user?.role === 'direzione'
  const [showAllTasks, setShowAllTasks] = useState(
    canSeeAllTasks ? searchParams.get('all') === 'true' : false
  )

  const debouncedSearch = useDebounce(searchTerm, 300)

  // Sync view mode changes to URL
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('view', mode)
      return next
    })
  }, [setSearchParams])

  useEffect(() => {
    fetchProjects()
    fetchDepartments()
    fetchUsers({ limit: 200 })
  }, [fetchProjects, fetchDepartments, fetchUsers])

  useEffect(() => {
    const filters: Record<string, string> = {}
    if (debouncedSearch) filters.search = debouncedSearch
    if (statusFilter) filters.status = statusFilter
    if (priorityFilter) filters.priority = priorityFilter
    if (projectFilter) filters.projectId = projectFilter
    if (departmentFilter) filters.departmentId = departmentFilter
    if (showAllTasks && canSeeAllTasks) filters.all = 'true'
    // Preserve view mode in URL
    if (viewMode && viewMode !== 'list') filters.view = viewMode

    const params = new URLSearchParams(filters)
    setSearchParams(params)

    fetchMyTasks({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      limit: 100,
    })

    if (showAllTasks && canSeeAllTasks) {
      fetchTasks({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined,
        standalone: projectFilter === 'standalone' ? true : undefined,
        departmentId: departmentFilter || undefined,
        page: 1,
        limit: 200,
      })
    }
  }, [debouncedSearch, statusFilter, priorityFilter, projectFilter, departmentFilter, showAllTasks, canSeeAllTasks, viewMode, user?.id])

  // -------------------------
  // Memoised derived data
  // -------------------------

  /** Raw task list (before advanced filter) based on basic filters + showAll */
  const rawTaskList = useMemo(
    () => (showAllTasks && canSeeAllTasks ? tasks : myTasks),
    [tasks, myTasks, showAllTasks, canSeeAllTasks]
  )

  /** Task list after applying advanced filter rules */
  const taskList = useMemo(
    () => applyAdvancedFilter(rawTaskList, advancedFilter),
    [rawTaskList, advancedFilter]
  )

  const activeFilterCount = useMemo(
    () =>
      [searchTerm, statusFilter, priorityFilter, projectFilter, departmentFilter].filter(Boolean).length,
    [searchTerm, statusFilter, priorityFilter, projectFilter, departmentFilter]
  )

  const advancedFilterRuleCount = advancedFilter.rules.length

  const advancedFilterDescription = useMemo(
    () => describeAdvancedFilter(advancedFilter),
    [advancedFilter]
  )

  const currentFilters = useMemo<Record<string, unknown>>(() => {
    const filters: Record<string, unknown> = {}
    if (searchTerm) filters.search = searchTerm
    if (statusFilter) filters.status = statusFilter
    if (priorityFilter) filters.priority = priorityFilter
    if (projectFilter) filters.projectId = projectFilter
    if (departmentFilter) filters.departmentId = departmentFilter
    if (showAllTasks && canSeeAllTasks) filters.all = true
    if (advancedFilter.rules.length > 0) {
      filters.advancedFilter = advancedFilter
    }
    return filters
  }, [searchTerm, statusFilter, priorityFilter, projectFilter, departmentFilter, showAllTasks, canSeeAllTasks, advancedFilter])

  // -------------------------
  // Callbacks
  // -------------------------

  const handleTimerToggle = useCallback(
    async (taskId: string) => {
      try {
        if (runningTimer?.taskId === taskId) {
          await stopTimer()
        } else {
          await startTimer(taskId)
        }
      } catch {
        // silently ignore
      }
    },
    [runningTimer?.taskId, startTimer, stopTimer]
  )

  const canCreateTask = !!user

  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  /** Called by TaskBulkActionBar when the user picks a new status and clicks Apply */
  const handleBulkStatusChange = useCallback(async (status: string) => {
    const ids = Array.from(selectedTaskIds)
    await Promise.all(ids.map((id) => changeTaskStatus(id, status as Task['status'])))
    setSelectedTaskIds(new Set())
  }, [selectedTaskIds, changeTaskStatus])

  /** Called by TaskBulkActionBar when the user picks a new priority and clicks Apply */
  const handleBulkPriorityChange = useCallback(async (priority: string) => {
    const ids = Array.from(selectedTaskIds)
    try {
      await Promise.all(ids.map((id) => updateTask(id, { priority: priority as Task['priority'] })))
      setSelectedTaskIds(new Set())
    } catch {
      toast.error('Errore', 'Impossibile applicare le modifiche')
    }
  }, [selectedTaskIds, updateTask])

  const handleBulkDelete = useCallback(async () => {
    if (selectedTaskIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      await bulkDeleteTasks(Array.from(selectedTaskIds))
      setSelectedTaskIds(new Set())
      setShowBulkDeleteConfirm(false)
    } catch {
      // Error toast shown by store
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedTaskIds, bulkDeleteTasks])

  const handleBlockedConfirm = useCallback(
    async (reason: string) => {
      if (!pendingBlockedTaskId) return
      setIsChangingStatus(true)
      try {
        await changeTaskStatus(pendingBlockedTaskId, 'blocked', reason)
        setShowBlockedModal(false)
        setPendingBlockedTaskId(null)
        setPendingBlockedTaskTitle('')
      } catch {
        // silently ignore
      } finally {
        setIsChangingStatus(false)
      }
    },
    [pendingBlockedTaskId, changeTaskStatus]
  )

  const handleBlockedCancel = useCallback(() => {
    setShowBlockedModal(false)
    setPendingBlockedTaskId(null)
    setPendingBlockedTaskTitle('')
  }, [])

  const handleRequestBlockedModal = useCallback((taskId: string, taskTitle: string) => {
    setPendingBlockedTaskId(taskId)
    setPendingBlockedTaskTitle(taskTitle)
    setShowBlockedModal(true)
  }, [])

  const handleApplyView = useCallback(
    (filters: Record<string, unknown>) => {
      setSearchTerm((filters.search as string) ?? '')
      setStatusFilter((filters.status as string) ?? '')
      setPriorityFilter((filters.priority as string) ?? '')
      setProjectFilter((filters.projectId as string) ?? '')
      setDepartmentFilter((filters.departmentId as string) ?? '')
      if (canSeeAllTasks) {
        setShowAllTasks(!!filters.all)
      }
      if (filters.advancedFilter && typeof filters.advancedFilter === 'object') {
        const af = filters.advancedFilter as AdvancedFilter
        setAdvancedFilter(af)
        if (af.rules.length > 0) setShowAdvancedFilter(true)
      } else {
        setAdvancedFilter(EMPTY_ADVANCED_FILTER)
      }
    },
    [canSeeAllTasks]
  )

  const handleResetFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('')
    setPriorityFilter('')
    setProjectFilter('')
    setDepartmentFilter('')
    setAdvancedFilter(EMPTY_ADVANCED_FILTER)
  }, [])

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  /** Shared refetch helper used by QuickAddTask */
  const handleQuickAddCreated = useCallback(() => {
    fetchMyTasks({ status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 100 })
    if (showAllTasks && canSeeAllTasks) {
      fetchTasks({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined,
        standalone: projectFilter === 'standalone' ? true : undefined,
        departmentId: departmentFilter || undefined,
        page: 1,
        limit: 200,
      })
    }
  }, [fetchMyTasks, fetchTasks, statusFilter, priorityFilter, showAllTasks, canSeeAllTasks, debouncedSearch, projectFilter, departmentFilter])

  // -------------------------
  // Per-item change handlers (passed to TaskListViewItem)
  // -------------------------

  const handleStatusChange = useCallback(
    async (taskId: string, status: string) => {
      await changeTaskStatus(taskId, status as TaskStatus)
    },
    [changeTaskStatus]
  )

  const handlePriorityChange = useCallback(
    async (taskId: string, priority: string) => {
      await updateTask(taskId, { priority: priority as Task['priority'] })
    },
    [updateTask]
  )

  const handleDueDateChange = useCallback(
    async (taskId: string, date: string | null) => {
      await updateTask(taskId, { dueDate: date })
    },
    [updateTask]
  )

  const handleAssigneeChange = useCallback(
    async (taskId: string, userId: string | null) => {
      await updateTask(taskId, { assigneeId: userId })
    },
    [updateTask]
  )

  // -------------------------
  // Loading skeleton
  // -------------------------

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="skeleton h-8 w-24" />
            <div className="skeleton h-4 w-48 mt-2" />
          </div>
          <div className="skeleton h-10 w-32" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="skeleton h-9 w-56 rounded-lg" />
          <div className="skeleton h-9 w-36 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
        <div className="card p-6">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton h-5 w-32 mb-3 rounded-lg" />
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 border-l-slate-200 dark:border-l-slate-700">
                      <div className="skeleton w-3.5 h-3.5 rounded" />
                      <div className="skeleton h-4 w-20 rounded-full" />
                      <div className="skeleton h-4 flex-1 rounded" />
                      <div className="skeleton h-4 w-16 rounded" />
                      <div className="skeleton h-4 w-20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------
  // Render helpers
  // -------------------------

  /** Collapsible section wrapper — label shows count inline */
  const renderSection = (
    key: string,
    label: string,
    items: Task[],
    showWhenEmpty = false
  ) => {
    if (items.length === 0 && !showWhenEmpty) return null
    const collapsed = collapsedSections.has(key)
    return (
      <div key={key}>
        <button
          type="button"
          onClick={() => toggleSection(key)}
          className="flex items-center justify-between w-full py-2 select-none group/header"
          aria-expanded={!collapsed}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass(key)}`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {label} ({items.length})
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
              collapsed ? '' : 'rotate-180'
            }`}
            aria-hidden="true"
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
          }`}
        >
          <div className="space-y-1 pb-2">
            {items.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.03 }}
              >
                <TaskListViewItem
                  task={task}
                  isSelected={selectedTaskIds.has(task.id)}
                  onSelect={handleToggleTaskSelection}
                  onStatusChange={(id, status) => void handleStatusChange(id, status)}
                  onPriorityChange={(id, priority) => void handlePriorityChange(id, priority)}
                  onDueDateChange={(id, date) => void handleDueDateChange(id, date)}
                  onAssigneeChange={(id, userId) => void handleAssigneeChange(id, userId)}
                  onTimerToggle={(id) => void handleTimerToggle(id)}
                  runningTimerId={runningTimer?.taskId ?? null}
                  canTrackTime={canTrackTime}
                  onRequestBlockedModal={handleRequestBlockedModal}
                />
              </motion.div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-2">
                Nessun task in questa sezione
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // -------------------------
  // Main render
  // -------------------------

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Task</h1>
          <p className="page-subtitle mt-1">
            Gestisci e traccia i tuoi task
          </p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          {canSeeAllTasks && (
            <ExportButton
              entity="tasks"
              filters={{
                ...(projectFilter && projectFilter !== 'standalone' ? { projectId: projectFilter } : {}),
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(departmentFilter ? { departmentId: departmentFilter } : {}),
              }}
            />
          )}
          {canCreateTask && (
            <button onClick={() => navigate('/tasks/new')} className="btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Task
            </button>
          )}
        </div>
      </div>

      {/* ---- Saved Views Bar (shown when toggled from secondary filters) ---- */}
      <AnimatePresence>
        {showSavedViews && (
          <motion.div
            key="saved-views"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <SavedViewsBar
              entity="task"
              currentFilters={currentFilters}
              onApplyView={handleApplyView}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Filter Bar ---- */}
      <TaskListViewFilters
        search={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        projectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        showAll={showAllTasks}
        onShowAllChange={setShowAllTasks}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isAdmin={canSeeAllTasks}
        projects={projects}
        departments={departments}
        users={users}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetFilters}
        showAdvancedFilter={showAdvancedFilter}
        onToggleAdvancedFilter={() => setShowAdvancedFilter((v) => !v)}
        advancedFilterRuleCount={advancedFilterRuleCount}
        onShowSavedViews={() => setShowSavedViews((v) => !v)}
        savedViewCount={0}
      />

      {/* ---- Advanced Filter Panel (animated slide-down) ---- */}
      <AnimatePresence>
        {showAdvancedFilter && (
          <motion.div
            key="advanced-filter-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pt-0.5">
              <AdvancedFilterBuilder
                filter={advancedFilter}
                onChange={setAdvancedFilter}
                users={users}
                projects={projects}
                departments={departments}
              />
              {advancedFilterDescription && (
                <p className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium pl-1">
                  {advancedFilterDescription} — i risultati visualizzati sono gia filtrati.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Tasks Content ---- */}
      {viewMode === 'tree' ? (
        <TaskTreeView
          mode="full"
          myTasksOnly={!showAllTasks}
          excludeCompleted={false}
          projectId={projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined}
          showSummary={true}
          showControls={true}
          showFilters={false}
          editable={true}
          onTimerToggle={handleTimerToggle}
          runningTimerId={runningTimer?.taskId ?? null}
          canTrackTime={canTrackTime}
        />
      ) : viewMode === 'table' ? (
        (() => {
          const handleRefetch = () => {
            fetchMyTasks({ status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 100 })
            if (showAllTasks && canSeeAllTasks) {
              fetchTasks({
                search: debouncedSearch || undefined,
                status: statusFilter || undefined,
                priority: priorityFilter || undefined,
                projectId: projectFilter && projectFilter !== 'standalone' ? projectFilter : undefined,
                standalone: projectFilter === 'standalone' ? true : undefined,
                departmentId: departmentFilter || undefined,
                page: 1,
                limit: 200,
              })
            }
          }
          return (
            <TaskTableView
              tasks={taskList}
              selectedTasks={selectedTaskIds}
              onToggleSelect={handleToggleTaskSelection}
              onSelectAll={() => {
                if (taskList.every((t) => selectedTaskIds.has(t.id))) {
                  setSelectedTaskIds(new Set())
                } else {
                  setSelectedTaskIds(new Set(taskList.map((t) => t.id)))
                }
              }}
              onRefresh={handleRefetch}
            />
          )
        })()
      ) : viewMode === 'kanban' ? (
        <Suspense fallback={<ViewLoader />}>
          <KanbanBoardPage />
        </Suspense>
      ) : viewMode === 'gantt' ? (
        <Suspense fallback={<ViewLoader />}>
          <GanttInlineView projectFilter={projectFilter} />
        </Suspense>
      ) : viewMode === 'calendar' ? (
        <Suspense fallback={<ViewLoader />}>
          <CalendarInlineView />
        </Suspense>
      ) : (
        /* ---- List View ---- */
        (() => {
          if (taskList.length === 0) {
            const hasFilters = !!(searchTerm || statusFilter || priorityFilter || projectFilter)
            return (
              <div className="card">
                <EmptyState
                  icon={CheckSquare}
                  title={hasFilters ? 'Nessun task trovato' : 'Nessun task'}
                  description={hasFilters ? 'Prova a modificare i filtri' : 'Crea il primo task per iniziare!'}
                  action={
                    canCreateTask && !hasFilters
                      ? { label: 'Crea Task', onClick: () => navigate('/tasks/new') }
                      : undefined
                  }
                />
              </div>
            )
          }

          const recurringTasks = taskList.filter((t) => t.isRecurring && t.status !== 'done')
          const inProgressTasks = taskList.filter((t) => t.status === 'in_progress' && !t.isRecurring)
          const todoTasks = taskList.filter((t) => t.status === 'todo' && !t.isRecurring)
          const blockedTasks = taskList.filter((t) => t.status === 'blocked' && !t.isRecurring)
          const reviewTasks = taskList.filter((t) => t.status === 'review' && !t.isRecurring)
          const completedTasks = taskList.filter((t) => t.status === 'done')

          return (
            <div className="card p-6">
              {/* Single QuickAddTask at the top */}
              <div className="mb-5 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-white/[0.02]">
                <QuickAddTask
                  defaultStatus={
                    (statusFilter as TaskStatus) ||
                    (inProgressTasks.length > 0 ? 'in_progress' : 'todo')
                  }
                  placeholder="Aggiungi nuovo task..."
                  onCreated={handleQuickAddCreated}
                />
              </div>

              <div className="space-y-4">
                {recurringTasks.length > 0 &&
                  renderSection('recurring', 'Ricorrenti', recurringTasks)}

                {renderSection('in_progress', 'In Corso', inProgressTasks, true)}

                {renderSection('todo', 'Da Fare', todoTasks, true)}

                {reviewTasks.length > 0 &&
                  renderSection('review', 'In Revisione', reviewTasks)}

                {blockedTasks.length > 0 &&
                  renderSection('blocked', 'Bloccati', blockedTasks)}

                {renderSection('done', 'Completati', completedTasks)}
              </div>
            </div>
          )
        })()
      )}

      {/* ---- Floating Bulk Action Bar ---- */}
      {selectedTaskIds.size > 0 && (
        <TaskBulkActionBar
          selectedIds={Array.from(selectedTaskIds)}
          onClearSelection={() => setSelectedTaskIds(new Set())}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkPriorityChange={handleBulkPriorityChange}
          onBulkDelete={() => setShowBulkDeleteConfirm(true)}
          isAdmin={user?.role === 'admin' || user?.role === 'direzione'}
        />
      )}

      {/* ---- Blocked Reason Modal ---- */}
      <BlockedReasonModal
        isOpen={showBlockedModal}
        taskTitle={pendingBlockedTaskTitle}
        isSubmitting={isChangingStatus}
        onCancel={handleBlockedCancel}
        onConfirm={handleBlockedConfirm}
      />

      {/* ---- Bulk Delete Confirmation Modal ---- */}
      <DeleteConfirmModal
        isOpen={showBulkDeleteConfirm}
        title={`Eliminare ${selectedTaskIds.size} task?`}
        message={`Stai per eliminare ${selectedTaskIds.size} task selezionat${selectedTaskIds.size === 1 ? 'o' : 'i'}. Questa azione non puo essere annullata.`}
        isDeleting={isBulkDeleting}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
