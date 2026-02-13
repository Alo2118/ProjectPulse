/**
 * Kanban Board Page - Drag & drop task management
 * @module pages/kanban/KanbanBoardPage
 */

import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { useDashboardStore } from '@stores/dashboardStore'
import { useAuthStore } from '@stores/authStore'
import {
  Loader2,
  Play,
  Square,
  User,
  Calendar,
  GripVertical,
  LayoutGrid,
} from 'lucide-react'
import { Task, TaskStatus } from '@/types'
import { TASK_STATUS_LABELS, TASK_PRIORITY_BORDER_COLORS } from '@/constants'
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
}

function TaskCard({ task, isDragging, onTimerToggle, runningTimerTaskId, canTrackTime }: TaskCardProps) {
  const isTimerRunning = runningTimerTaskId === task.id

  const isHighPriority = task.priority === 'critical' || task.priority === 'high'

  return (
    <div
      className={`card p-3 border-l-4 ${TASK_PRIORITY_BORDER_COLORS[task.priority]} ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
      } ${isHighPriority ? 'shadow-glow-red' : ''}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0 cursor-grab" />
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
                  <Square className="w-4 h-4 text-red-500" />
                ) : (
                  <Play className="w-4 h-4 text-gray-400 hover:text-primary-500" />
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
}

function SortableTaskCard({ task, onTimerToggle, runningTimerTaskId, canTrackTime }: SortableTaskCardProps) {
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        isDragging={isDragging}
        onTimerToggle={onTimerToggle}
        runningTimerTaskId={runningTimerTaskId}
        canTrackTime={canTrackTime}
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
}

function KanbanColumn({
  status,
  label,
  tasks,
  onTimerToggle,
  runningTimerTaskId,
  canTrackTime,
}: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-72 max-w-80">
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon type="taskStatus" value={status} size="md" />
        <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <AnimatedCounter value={tasks.length} />
        </span>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 min-h-96">
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
  const { runningTimer, startTimer, stopTimer } = useDashboardStore()
  const { user } = useAuthStore()

  const canTrackTime = user?.role !== 'direzione' // Direzione non può tracciare tempo

  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '')
  const [activeTask, setActiveTask] = useState<Task | null>(null)

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

  const handleTimerToggle = useCallback(
    async (taskId: string) => {
      try {
        if (runningTimer?.taskId === taskId) {
          await stopTimer()
        } else {
          await startTimer(taskId)
        }
      } catch (error) {
        console.error('Timer error:', error)
      }
    },
    [runningTimer, startTimer, stopTimer]
  )

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
      } catch (error) {
        console.error('Failed to change task status:', error)
      }
    }
  }

  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    review: tasks.filter((t) => t.status === 'review'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    done: tasks.filter((t) => t.status === 'done'),
    cancelled: [],
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <LayoutGrid className="w-6 h-6 mr-2 text-primary-500" />
            Kanban Board
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Trascina i task per cambiare lo stato
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
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
          {projectFilter && (
            <button
              onClick={() => setProjectFilter('')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Mostra tutti
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                status={column.id}
                label={column.label}
                color={column.color}
                tasks={tasksByStatus[column.id]}
                onTimerToggle={handleTimerToggle}
                runningTimerTaskId={runningTimer?.taskId || null}
                canTrackTime={canTrackTime}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                isDragging
                onTimerToggle={handleTimerToggle}
                runningTimerTaskId={runningTimer?.taskId || null}
                canTrackTime={canTrackTime}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
