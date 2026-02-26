/**
 * Kanban Board Page - Drag & drop task management
 * @module pages/kanban/KanbanBoardPage
 */

import { useEffect, useState, useMemo, useRef, KeyboardEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTaskStore } from '@stores/taskStore'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { useTimerToggle } from '@hooks/useTimerToggle'
import { QuickAddTask } from '@components/tasks/QuickAddTask'
import { BlockedReasonModal } from '@components/tasks/BlockedReasonModal'
import { toast } from '@stores/toastStore'
import {
  Play,
  Square,
  User,
  Calendar,
  Clock,
  GripVertical,
  LayoutGrid,
  CheckSquare,
  Repeat,
  GitBranch,
} from 'lucide-react'
import { Task, TaskStatus } from '@/types'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, TASK_PRIORITY_BORDER_COLORS, TASK_PRIORITY_OPTIONS } from '@/constants'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { EmptyState } from '@components/common/EmptyState'
import { formatDateRelative, getDueDateColor } from '@utils/dateFormatters'

const KANBAN_COLUMN_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  review: 'bg-yellow-500',
  blocked: 'bg-red-500',
  done: 'bg-green-500',
  cancelled: 'bg-gray-400',
}

const statusColumns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: TASK_STATUS_LABELS.todo, color: KANBAN_COLUMN_COLORS.todo },
  { id: 'in_progress', label: TASK_STATUS_LABELS.in_progress, color: KANBAN_COLUMN_COLORS.in_progress },
  { id: 'review', label: TASK_STATUS_LABELS.review, color: KANBAN_COLUMN_COLORS.review },
  { id: 'blocked', label: TASK_STATUS_LABELS.blocked, color: KANBAN_COLUMN_COLORS.blocked },
  { id: 'done', label: TASK_STATUS_LABELS.done, color: KANBAN_COLUMN_COLORS.done },
]

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onTimerToggle: (taskId: string) => void
  runningTimerTaskId: string | null
  canTrackTime: boolean
  showStatusBadge?: boolean
  onKeyboardActivate?: () => void
}

function TaskCard({ task, isDragging, onTimerToggle, runningTimerTaskId, canTrackTime, showStatusBadge, onKeyboardActivate }: TaskCardProps) {
  const isTimerRunning = runningTimerTaskId === task.id

  const isHighPriority = task.priority === 'critical' || task.priority === 'high'

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onKeyboardActivate?.()
    }
  }

  return (
    <div
      className={`card p-3 border-l-4 ${
        task.taskType === 'subtask'
          ? 'border-l-violet-400 dark:border-l-violet-500 bg-violet-50/50 dark:bg-violet-900/10'
          : TASK_PRIORITY_BORDER_COLORS[task.priority]
      } ${isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''} ${
        isHighPriority && task.taskType !== 'subtask' ? 'shadow-glow-red' : ''
      }`}
      onKeyDown={handleCardKeyDown}
    >
      {task.taskType === 'subtask' && task.parentTask && (
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-violet-200 dark:border-violet-800/40">
          <GitBranch className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
          <Link
            to={`/tasks/${task.parentTask.id}`}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 truncate"
            title={`${task.parentTask.code} - ${task.parentTask.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            {task.parentTask.title}
          </Link>
        </div>
      )}
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon type="taskPriority" value={task.priority} size="sm" />
            <Link
              to={`/tasks/${task.id}`}
              className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
            >
              {task.title}
            </Link>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {task.project?.name && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {task.project.name}
              </p>
            )}
            {showStatusBadge && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[task.status]}`}>
                {TASK_STATUS_LABELS[task.status]}
              </span>
            )}
          </div>

          {task.estimatedHours && (
            <div className="mt-1.5">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>
                  {task.actualHours ?? '0'}h / {task.estimatedHours}h
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 dark:bg-primary-400 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((task.actualHours ?? 0) /
                          (task.estimatedHours || 1)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {task.assignee && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <User className="w-3 h-3 mr-1" />
                  <span className="truncate max-w-16">
                    {task.assignee.firstName?.charAt(0)}.{task.assignee.lastName?.charAt(0)}.
                  </span>
                </div>
              )}
              {task.dueDate && (
                <div className={`flex items-center text-xs ${getDueDateColor(task.dueDate, task.status)}`}>
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDateRelative(task.dueDate)}
                </div>
              )}
            </div>
            {canTrackTime && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onTimerToggle(task.id)
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
              >
                {isTimerRunning ? (
                  <Square className="w-4 h-4 text-red-500 dark:text-red-400" />
                ) : (
                  <Play className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SortableTaskCardProps {
  task: Task
  onTimerToggle: (taskId: string) => void
  runningTimerTaskId: string | null
  canTrackTime: boolean
  showStatusBadge?: boolean
  onNavigate?: () => void
}

function SortableTaskCard({ task, onTimerToggle, runningTimerTaskId, canTrackTime, showStatusBadge, onNavigate }: SortableTaskCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title}. Priorità: ${task.priority}. Stato: ${task.status}`}
    >
      <TaskCard
        task={task}
        isDragging={isDragging}
        onTimerToggle={onTimerToggle}
        runningTimerTaskId={runningTimerTaskId}
        canTrackTime={canTrackTime}
        showStatusBadge={showStatusBadge}
        onKeyboardActivate={() => { onNavigate?.(); navigate(`/tasks/${task.id}`) }}
      />
    </div>
  )
}

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  color: string
  tasks: Task[]
  onTimerToggle: (taskId: string) => void
  runningTimerTaskId: string | null
  canTrackTime: boolean
  columnIndex: number
  totalColumns: number
  onColumnFocus?: (index: number) => void
  selectedProjectId?: string
  onTaskCreated?: () => void
}

function KanbanColumn({
  status,
  label,
  tasks,
  onTimerToggle,
  runningTimerTaskId,
  canTrackTime,
  columnIndex,
  totalColumns,
  onColumnFocus,
  selectedProjectId,
  onTaskCreated,
}: KanbanColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null)

  const handleColumnKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' && columnIndex > 0) {
      e.preventDefault()
      onColumnFocus?.(columnIndex - 1)
    } else if (e.key === 'ArrowRight' && columnIndex < totalColumns - 1) {
      e.preventDefault()
      onColumnFocus?.(columnIndex + 1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Focus first task card in column
      const firstCard = columnRef.current?.querySelector<HTMLElement>('[tabindex="0"]')
      firstCard?.focus()
    }
  }

  return (
    <div
      ref={columnRef}
      className="flex-1 min-w-64 sm:min-w-72 max-w-80"
      onKeyDown={handleColumnKeyDown}
    >
      <div
        className="flex items-center gap-2 mb-3 cursor-default"
        tabIndex={0}
        role="columnheader"
        aria-label={`Colonna ${label}, ${tasks.length} task. Usa ← → per navigare tra colonne, ↓ per entrare nei task`}
      >
        <StatusIcon type="taskStatus" value={status} size="md" />
        <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
          <AnimatedCounter value={tasks.length} />
        </span>
      </div>
      <div className="bg-gray-100 dark:bg-surface-800/60 rounded-lg p-2 min-h-96">
        <QuickAddTask
          defaultStatus={status}
          defaultProjectId={selectedProjectId}
          placeholder="Aggiungi..."
          onCreated={() => onTaskCreated?.()}
        />
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
          id={status}
        >
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onTimerToggle={onTimerToggle}
                runningTimerTaskId={runningTimerTaskId}
                canTrackTime={canTrackTime}
              />
            ))}
          </div>
        </SortableContext>
        {tasks.length === 0 && (
          <EmptyState icon={CheckSquare} title="Nessun task" compact />
        )}
      </div>
    </div>
  )
}

export default function KanbanBoardPage() {
  const [searchParams] = useSearchParams()
  const { tasks, isLoading, fetchTasks, changeTaskStatus } = useTaskStore()
  const { projects, fetchProjects } = useProjectStore()
  const { canTrackTime, handleTimerToggle, runningTimerTaskId } = useTimerToggle()
  const { user } = useAuthStore()

  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [pendingBlockTask, setPendingBlockTask] = useState<{ id: string; title: string } | null>(null)
  const [isBlockSubmitting, setIsBlockSubmitting] = useState(false)

  // Refs for keyboard navigation between columns
  const columnHeaderRefs = useRef<(HTMLDivElement | null)[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    const filters: Record<string, string> = {
      limit: '100',
      status: 'todo,in_progress,review,blocked,done',
    }
    if (projectFilter) {
      filters.projectId = projectFilter
    }
    if (showSubtasks) {
      filters.includeSubtasks = 'true'
    }
    fetchTasks(filters)
  }, [fetchTasks, projectFilter, showSubtasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task
    setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Determine new status from drop target
    let newStatus: TaskStatus | null = null

    // Ignore drops on the recurring column (recurring is not a status)
    if (over.id === 'recurring') return

    // Check if dropped over a column
    const overData = over.data.current
    if (overData?.task) {
      // Dropped over another task - get its status
      newStatus = (overData.task as Task).status
    } else {
      // Check if over.id is a status column
      const isColumn = statusColumns.some((col) => col.id === over.id)
      if (isColumn) {
        newStatus = over.id as TaskStatus
      }
    }

    if (newStatus && newStatus !== task.status) {
      // Dipendente can only change status of own tasks
      if (user?.role === 'dipendente') {
        const isOwner = task.createdById === user.id || task.assigneeId === user.id
        if (!isOwner) return
      }

      if (newStatus === 'blocked') {
        setPendingBlockTask({ id: taskId, title: task.title })
        return
      }

      try {
        await changeTaskStatus(taskId, newStatus)
      } catch {
        // silently ignore
      }
    }
  }

  const handleBlockConfirm = async (reason: string) => {
    if (!pendingBlockTask) return
    setIsBlockSubmitting(true)
    try {
      await changeTaskStatus(pendingBlockTask.id, 'blocked', reason)
      setPendingBlockTask(null)
    } catch {
      toast.error('Errore', 'Impossibile bloccare il task')
      setPendingBlockTask(null)
    } finally {
      setIsBlockSubmitting(false)
    }
  }

  // Collect unique assignees from loaded tasks for the assignee filter dropdown
  const uniqueAssignees = useMemo(() => {
    const seen = new Set<string>()
    const result: { id: string; firstName: string; lastName: string }[] = []
    for (const task of tasks) {
      if (task.assignee && !seen.has(task.assignee.id)) {
        seen.add(task.assignee.id)
        result.push({
          id: task.assignee.id,
          firstName: task.assignee.firstName,
          lastName: task.assignee.lastName,
        })
      }
    }
    return result.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    )
  }, [tasks])

  // Apply priority, assignee filters and exclude subtasks client-side
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude subtasks unless toggle is on
      if (!showSubtasks && task.taskType === 'subtask') return false
      if (priorityFilter && task.priority !== priorityFilter) return false
      if (assigneeFilter && task.assignee?.id !== assigneeFilter) return false
      return true
    })
  }, [tasks, priorityFilter, assigneeFilter, showSubtasks])

  // Separate recurring tasks from normal tasks
  const recurringTasks = useMemo(() => {
    return filteredTasks.filter((t) => t.isRecurring)
  }, [filteredTasks])

  const normalTasks = useMemo(() => {
    return filteredTasks.filter((t) => !t.isRecurring)
  }, [filteredTasks])

  // Group normal (non-recurring) tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: normalTasks.filter((t) => t.status === 'todo'),
    in_progress: normalTasks.filter((t) => t.status === 'in_progress'),
    review: normalTasks.filter((t) => t.status === 'review'),
    blocked: normalTasks.filter((t) => t.status === 'blocked'),
    done: normalTasks.filter((t) => t.status === 'done'),
    cancelled: [],
  }

  const totalColumns = statusColumns.length + (recurringTasks.length > 0 ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <LayoutGrid className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-primary-500" />
          Kanban Board
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Trascina i task per cambiare lo stato
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Progetto:</label>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Tutti i progetti</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priorità:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per priorità"
          >
            <option value="">Tutte le priorità</option>
            {TASK_PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assegnatario:</label>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per assegnatario"
          >
            <option value="">Tutti gli assegnatari</option>
            {uniqueAssignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.lastName} {a.firstName}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              showSubtasks
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-surface-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            title={showSubtasks ? 'Nascondi subtask' : 'Mostra subtask'}
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Subtask</span>
          </button>

          {(projectFilter || priorityFilter || assigneeFilter || showSubtasks) && (
            <button
              onClick={() => {
                setProjectFilter('')
                setPriorityFilter('')
                setAssigneeFilter('')
                setShowSubtasks(false)
              }}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Reimposta filtri
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 animate-fade-in">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-64 sm:min-w-72 max-w-80">
              <div className="flex items-center gap-2 mb-3">
                <div className="skeleton w-6 h-6 rounded" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-5 w-8 rounded-full" />
              </div>
              <div className="bg-gray-100 dark:bg-surface-800/60 rounded-lg p-2 min-h-96">
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="card p-3 space-y-2">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-1/2" />
                      <div className="flex justify-between">
                        <div className="skeleton h-3 w-16" />
                        <div className="skeleton h-4 w-4 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            role="region"
            aria-label="Kanban Board. Usa frecce per navigare tra colonne, Invio per aprire un task"
          >
            {statusColumns.map((column, idx) => (
              <KanbanColumn
                key={column.id}
                status={column.id}
                label={column.label}
                color={column.color}
                tasks={tasksByStatus[column.id]}
                onTimerToggle={handleTimerToggle}
                runningTimerTaskId={runningTimerTaskId}
                canTrackTime={canTrackTime}
                columnIndex={idx}
                totalColumns={totalColumns}
                selectedProjectId={projectFilter || undefined}
                onTaskCreated={() => {
                  const filters: Record<string, string> = {
                    limit: '100',
                    status: 'todo,in_progress,review,blocked,done',
                  }
                  if (projectFilter) filters.projectId = projectFilter
                  if (showSubtasks) filters.includeSubtasks = 'true'
                  void fetchTasks(filters)
                }}
                onColumnFocus={(targetIdx) => {
                  const target = columnHeaderRefs.current[targetIdx]
                  if (target) {
                    const header = target.querySelector<HTMLElement>('[role="columnheader"]')
                    header?.focus()
                  }
                }}
              />
            ))}

            {/* Recurring tasks column */}
            {recurringTasks.length > 0 && (
              <div className="flex-1 min-w-64 sm:min-w-72 max-w-80">
                <div
                  className="flex items-center gap-2 mb-3 cursor-default"
                  tabIndex={0}
                  role="columnheader"
                  aria-label={`Colonna Ricorrenti, ${recurringTasks.length} task`}
                >
                  <Repeat className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Ricorrenti</h3>
                  <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                    <AnimatedCounter value={recurringTasks.length} />
                  </span>
                </div>
                <div className="bg-violet-50 dark:bg-violet-900/10 rounded-lg p-2 min-h-96 border border-violet-200 dark:border-violet-800/40">
                  <SortableContext
                    items={recurringTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                    id="recurring"
                  >
                    <div className="space-y-2">
                      {recurringTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onTimerToggle={handleTimerToggle}
                          runningTimerTaskId={runningTimerTaskId}
                          canTrackTime={canTrackTime}
                          showStatusBadge
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                isDragging
                onTimerToggle={handleTimerToggle}
                runningTimerTaskId={runningTimerTaskId}
                canTrackTime={canTrackTime}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <BlockedReasonModal
        isOpen={!!pendingBlockTask}
        taskTitle={pendingBlockTask?.title ?? ''}
        isSubmitting={isBlockSubmitting}
        onCancel={() => setPendingBlockTask(null)}
        onConfirm={handleBlockConfirm}
      />
    </div>
  )
}
