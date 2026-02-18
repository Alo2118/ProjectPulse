/**
 * Kanban Board Page - Drag & drop task management
 * @module pages/kanban/KanbanBoardPage
 */

import { useEffect, useState, useCallback, useMemo, useRef, KeyboardEvent } from 'react'
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
import {
  Play,
  Square,
  User,
  Calendar,
  GripVertical,
  LayoutGrid,
} from 'lucide-react'
import { Task, TaskStatus } from '@/types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_BORDER_COLORS, TASK_PRIORITY_OPTIONS } from '@/constants'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

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

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return `${Math.abs(diff)}g fa`
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onTimerToggle: (taskId: string) => void
  runningTimerTaskId: string | null
  canTrackTime: boolean
  onKeyboardActivate?: () => void
}

function TaskCard({ task, isDragging, onTimerToggle, runningTimerTaskId, canTrackTime, onKeyboardActivate }: TaskCardProps) {
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
      className={`card p-3 border-l-4 ${TASK_PRIORITY_BORDER_COLORS[task.priority]} ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
      } ${isHighPriority ? 'shadow-glow-red' : ''}`}
      onKeyDown={handleCardKeyDown}
    >
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.code}</p>

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
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(task.dueDate)}
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
  onNavigate?: () => void
}

function SortableTaskCard({ task, onTimerToggle, runningTimerTaskId, canTrackTime, onNavigate }: SortableTaskCardProps) {
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
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-surface-700 text-gray-600 dark:text-gray-300">
          <AnimatedCounter value={tasks.length} />
        </span>
      </div>
      <div className="bg-gray-100 dark:bg-surface-800/60 rounded-lg p-2 min-h-96">
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
          <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            Nessun task
          </div>
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
    fetchTasks(filters)
  }, [fetchTasks, projectFilter])

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

      try {
        await changeTaskStatus(taskId, newStatus)
      } catch {
        // silently ignore
      }
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

  // Apply priority and assignee filters client-side
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (priorityFilter && task.priority !== priorityFilter) return false
      if (assigneeFilter && task.assignee?.id !== assigneeFilter) return false
      return true
    })
  }, [tasks, priorityFilter, assigneeFilter])

  // Group filtered tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    review: filteredTasks.filter((t) => t.status === 'review'),
    blocked: filteredTasks.filter((t) => t.status === 'blocked'),
    done: filteredTasks.filter((t) => t.status === 'done'),
    cancelled: [],
  }

  return (
    <div className="space-y-6">
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
                {p.code} - {p.name}
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

          {(projectFilter || priorityFilter || assigneeFilter) && (
            <button
              onClick={() => {
                setProjectFilter('')
                setPriorityFilter('')
                setAssigneeFilter('')
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
            aria-label="Kanban Board. Usa ← → per navigare tra colonne, ↓ per accedere ai task, Invio per aprire un task"
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
                totalColumns={statusColumns.length}
                onColumnFocus={(targetIdx) => {
                  // Focus the header of the target column
                  const target = columnHeaderRefs.current[targetIdx]
                  if (target) {
                    const header = target.querySelector<HTMLElement>('[role="columnheader"]')
                    header?.focus()
                  }
                }}
              />
            ))}
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
    </div>
  )
}
