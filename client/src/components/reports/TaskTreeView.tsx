/**
 * TaskTreeView - Hierarchical view of projects, tasks and subtasks
 * Supports multiple modes: compact (dashboard), full (reports/tasks page)
 * @module components/reports/TaskTreeView
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTaskTreeStore } from '@stores/taskTreeStore'
import {
  ChevronRight,
  FolderKanban,
  CheckSquare,
  Loader2,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Filter,
  Play,
  Square,
  Target,
} from 'lucide-react'
import type { ProjectNode, TaskNode, SubtaskNode, MilestoneNode, TaskTreeStats } from '@/types'
import { EmptyState } from '@/components/common/EmptyState'

interface TaskTreeViewProps {
  /** Display mode */
  mode?: 'compact' | 'full'
  /** Show only user's assigned tasks */
  myTasksOnly?: boolean
  /** Filter by specific user ID */
  filterUserId?: string
  /** Hide completed tasks */
  excludeCompleted?: boolean
  /** Show summary cards at top */
  showSummary?: boolean
  /** Show expand/collapse controls */
  showControls?: boolean
  /** Show filter controls */
  showFilters?: boolean
  /** Maximum tree depth to show (0 = unlimited) */
  maxDepth?: number
  /** Project ID to filter */
  projectId?: string
  /** Parent task ID - shows only subtasks of this task */
  parentTaskId?: string
  /** Skip the project level, render milestones/tasks directly */
  skipProjectLevel?: boolean
  /** Callback when timer button is clicked */
  onTimerToggle?: (taskId: string) => void
  /** Currently running timer task ID */
  runningTimerId?: string | null
  /** Whether user can track time */
  canTrackTime?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Status badge component
 */
function StatusBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    todo: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Circle, label: 'Da fare' },
    in_progress: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2, label: 'In corso' },
    review: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckSquare, label: 'Review' },
    blocked: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle, label: 'Bloccato' },
    done: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Completato' },
    cancelled: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500', icon: XCircle, label: 'Annullato' },
    planning: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Circle, label: 'Pianificazione' },
    design: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2, label: 'Design' },
    verification: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckSquare, label: 'Verifica' },
    validation: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: CheckSquare, label: 'Validazione' },
    transfer: { color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: CheckSquare, label: 'Transfer' },
    maintenance: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Pause, label: 'Manutenzione' },
    completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: 'Completato' },
    on_hold: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Pause, label: 'In pausa' },
  }

  const { color, icon: Icon, label } = config[status] || config.todo

  if (compact) {
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${color}`} title={label}>
        <Icon className="w-3 h-3" />
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

/**
 * Priority indicator
 */
function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-400',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  }
  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[priority] || colors.medium}`}
      title={`Priorità: ${priority}`}
    />
  )
}

/**
 * Progress bar component
 */
function ProgressBar({ progress, size = 'md' }: { progress: number; size?: 'sm' | 'md' }) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2'
  const color = progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'

  return (
    <div
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.min(progress, 100))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progresso: ${Math.round(Math.min(progress, 100))}%`}
    >
      <div
        className={`${height} rounded-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

/**
 * Statistics summary component
 */
function StatsSummary({ stats, compact = false }: { stats: TaskTreeStats; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1" title="Completati">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {stats.completed}
        </span>
        <span className="flex items-center gap-1" title="In corso">
          <Loader2 className="w-3 h-3 text-blue-500" />
          {stats.inProgress}
        </span>
        {stats.blocked > 0 && (
          <span className="flex items-center gap-1" title="Bloccati">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            {stats.blocked}
          </span>
        )}
        {stats.totalHours > 0 && (
          <span className="flex items-center gap-1" title="Ore registrate">
            <Clock className="w-3 h-3" />
            {stats.totalHours.toFixed(1)}h
          </span>
        )}
      </div>
    )
  }

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Avanzamento:</span>
        <div className="w-24">
          <ProgressBar progress={progress} size="sm" />
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          {stats.completed}/{stats.total}
        </span>
        {stats.blocked > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="w-3 h-3" />
            {stats.blocked} bloccati
          </span>
        )}
        {stats.totalHours > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stats.totalHours.toFixed(1)}h
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Subtask node component (recursive)
 */
function SubtaskNodeItem({
  subtask,
  level,
  isExpanded,
  onToggle,
  expandedTasks,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
}: {
  subtask: SubtaskNode
  level: number
  isExpanded: boolean
  onToggle: (id: string) => void
  expandedTasks: Set<string>
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
}) {
  const hasChildren = subtask.subtasks && subtask.subtasks.length > 0
  const canExpand = maxDepth === 0 || level < maxDepth
  const paddingLeft = compact ? 16 + level * 12 : 24 + level * 20
  const isTimerRunning = runningTimerId === subtask.id

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-surface-800/40 cursor-pointer border-l-2 border-gray-200 dark:border-gray-700 ${
          compact ? 'py-1.5' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={() => hasChildren && canExpand && onToggle(subtask.id)}
      >
        {hasChildren && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <PriorityDot priority={subtask.priority} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!compact && <span className="text-xs font-mono text-gray-400">{subtask.code}</span>}
            <Link
              to={`/tasks/${subtask.id}`}
              className={`text-gray-700 dark:text-gray-300 truncate hover:text-primary-600 dark:hover:text-primary-400 ${
                compact ? 'text-xs' : 'text-sm'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {subtask.title}
            </Link>
          </div>
        </div>

        <StatusBadge status={subtask.status} compact={compact} />

        {!compact && subtask.assignee && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            {subtask.assignee.firstName} {subtask.assignee.lastName.charAt(0)}.
          </span>
        )}

        {canTrackTime && onTimerToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTimerToggle(subtask.id)
            }}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              isTimerRunning
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500'
            }`}
            title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
          >
            {isTimerRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        )}

        {!compact && hasChildren && <StatsSummary stats={subtask.stats} compact />}
      </div>

      {hasChildren && isExpanded && canExpand && (
        <div>
          {subtask.subtasks.map((child) => (
            <SubtaskNodeItem
              key={child.id}
              subtask={child}
              level={level + 1}
              isExpanded={expandedTasks.has(child.id)}
              onToggle={onToggle}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Task node component
 */
function TaskNodeItem({
  task,
  isExpanded,
  onToggle,
  expandedTasks,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
}: {
  task: TaskNode
  isExpanded: boolean
  onToggle: (id: string) => void
  expandedTasks: Set<string>
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
}) {
  const hasChildren = task.subtasks && task.subtasks.length > 0
  const canExpand = maxDepth === 0 || maxDepth > 1
  const isTimerRunning = runningTimerId === task.id

  return (
    <div className={`border-l-2 border-blue-200 dark:border-blue-800 ${compact ? 'ml-2' : 'ml-4'}`}>
      <div
        className={`flex items-center gap-2 px-3 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer ${
          compact ? 'py-1.5' : 'py-2.5'
        }`}
        onClick={() => hasChildren && canExpand && onToggle(task.id)}
      >
        {hasChildren && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <CheckSquare className={`text-blue-500 flex-shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        <PriorityDot priority={task.priority} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {!compact && <span className="text-xs font-mono text-gray-400">{task.code}</span>}
            <Link
              to={`/tasks/${task.id}`}
              className={`font-medium text-gray-800 dark:text-gray-200 truncate hover:text-primary-600 dark:hover:text-primary-400 ${
                compact ? 'text-sm' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
            </Link>
          </div>
        </div>

        <StatusBadge status={task.status} compact={compact} />

        {!compact && task.assignee && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            {task.assignee.firstName} {task.assignee.lastName.charAt(0)}.
          </span>
        )}

        {canTrackTime && onTimerToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTimerToggle(task.id)
            }}
            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
              isTimerRunning
                ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-500'
            }`}
            title={isTimerRunning ? 'Stop timer' : 'Avvia timer'}
          >
            {isTimerRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        )}

        {!compact && hasChildren && <StatsSummary stats={task.stats} compact />}
      </div>

      {hasChildren && isExpanded && canExpand && (
        <div className={compact ? 'ml-1' : 'ml-2'}>
          {task.subtasks.map((subtask) => (
            <SubtaskNodeItem
              key={subtask.id}
              subtask={subtask}
              level={0}
              isExpanded={expandedTasks.has(subtask.id)}
              onToggle={onToggle}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth > 0 ? maxDepth - 1 : 0}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Milestone node component
 */
function MilestoneNodeItem({
  milestone,
  isExpanded,
  onToggle,
  expandedTasks,
  onToggleTask,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
}: {
  milestone: MilestoneNode
  isExpanded: boolean
  onToggle: () => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
}) {
  const hasTasks = milestone.tasks && milestone.tasks.length > 0
  const canExpand = maxDepth === 0 || maxDepth > 1
  const progress = milestone.stats.total > 0 ? Math.round((milestone.stats.completed / milestone.stats.total) * 100) : 0

  return (
    <div className={`border-l-2 border-amber-300 dark:border-amber-700 ${compact ? 'ml-2' : 'ml-4'}`}>
      <div
        className={`flex items-center gap-2 px-3 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent hover:from-amber-100/50 dark:hover:from-amber-900/20 cursor-pointer ${
          compact ? 'py-2' : 'py-3'
        }`}
        onClick={() => hasTasks && canExpand && onToggle()}
      >
        {hasTasks && canExpand ? (
          <ChevronRight
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <Target className={`text-amber-500 flex-shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <PriorityDot priority={milestone.priority} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/tasks/${milestone.id}`}
              className={`font-semibold text-amber-800 dark:text-amber-300 truncate hover:text-amber-600 dark:hover:text-amber-200 ${
                compact ? 'text-sm' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {milestone.title}
            </Link>
          </div>
        </div>

        {/* Progress for milestone */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-[100px] sm:min-w-[120px]">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {milestone.stats.completed}/{milestone.stats.total}
          </span>
          <div className="w-16">
            <ProgressBar progress={progress} size="sm" />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8">{progress}%</span>
        </div>

        {!compact && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {milestone.stats.totalHours.toFixed(1)}h/{milestone.stats.estimatedHours.toFixed(1)}h
          </span>
        )}

        {!compact && milestone.assignee && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            {milestone.assignee.firstName} {milestone.assignee.lastName.charAt(0)}.
          </span>
        )}
      </div>

      {hasTasks && isExpanded && canExpand && (
        <div className={compact ? 'ml-1' : 'ml-2'}>
          {milestone.tasks.map((task) => (
            <TaskNodeItem
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={onToggleTask}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth > 0 ? maxDepth - 1 : 0}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Project node component
 */
function ProjectNodeItem({
  project,
  isExpanded,
  onToggle,
  expandedMilestones,
  onToggleMilestone,
  expandedTasks,
  onToggleTask,
  maxDepth,
  compact,
  onTimerToggle,
  runningTimerId,
  canTrackTime,
}: {
  project: ProjectNode
  isExpanded: boolean
  onToggle: () => void
  expandedMilestones: Set<string>
  onToggleMilestone: (id: string) => void
  expandedTasks: Set<string>
  onToggleTask: (id: string) => void
  maxDepth: number
  compact: boolean
  onTimerToggle?: (taskId: string) => void
  runningTimerId?: string | null
  canTrackTime?: boolean
}) {
  const hasMilestones = project.milestones && project.milestones.length > 0
  const hasTasks = project.tasks && project.tasks.length > 0
  const hasContent = hasMilestones || hasTasks

  return (
    <div className={`card overflow-hidden ${compact ? 'shadow-sm' : ''}`}>
      <div
        className={`flex items-center gap-3 bg-gradient-to-r from-primary-50 to-transparent dark:from-primary-900/20 dark:to-transparent cursor-pointer ${
          compact ? 'p-3' : 'p-4'
        }`}
        onClick={onToggle}
      >
        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        />
        <FolderKanban className={`text-primary-500 flex-shrink-0 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <PriorityDot priority={project.priority} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/projects/${project.id}`}
              className={`font-semibold text-gray-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 ${
                compact ? 'text-sm' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {project.name}
            </Link>
          </div>
        </div>

        {!compact && <StatusBadge status={project.status} />}

        {!compact && project.owner && (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            {project.owner.firstName} {project.owner.lastName.charAt(0)}.
          </span>
        )}
      </div>

      {!compact && (
        <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <StatsSummary stats={project.stats} />
        </div>
      )}

      {hasContent && isExpanded && (
        <div className={compact ? 'py-1' : 'py-2'}>
          {/* Render milestones first */}
          {hasMilestones &&
            project.milestones.map((milestone) => (
              <MilestoneNodeItem
                key={milestone.id}
                milestone={milestone}
                isExpanded={expandedMilestones.has(milestone.id)}
                onToggle={() => onToggleMilestone(milestone.id)}
                expandedTasks={expandedTasks}
                onToggleTask={onToggleTask}
                maxDepth={maxDepth}
                compact={compact}
                onTimerToggle={onTimerToggle}
                runningTimerId={runningTimerId}
                canTrackTime={canTrackTime}
              />
            ))}

          {/* Render orphan tasks (tasks without milestone) */}
          {hasTasks &&
            project.tasks.map((task) => (
              <TaskNodeItem
                key={task.id}
                task={task}
                isExpanded={expandedTasks.has(task.id)}
                onToggle={onToggleTask}
                expandedTasks={expandedTasks}
                maxDepth={maxDepth}
                compact={compact}
                onTimerToggle={onTimerToggle}
                runningTimerId={runningTimerId}
                canTrackTime={canTrackTime}
              />
            ))}
        </div>
      )}

      {!hasContent && isExpanded && (
        <EmptyState icon={CheckSquare} title="Nessun task in questo progetto" compact />
      )}
    </div>
  )
}

/**
 * Summary cards component
 */
function SummaryCards({
  summary,
}: {
  summary: {
    totalProjects: number
    totalMilestones: number
    totalTasks: number
    totalSubtasks: number
    overallProgress: number
    totalHoursLogged: number
  }
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Progetti</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalProjects}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Milestone</p>
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.totalMilestones}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Task</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalTasks}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subtask</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSubtasks}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Avanzamento</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.overallProgress}%</p>
          <div className="flex-1">
            <ProgressBar progress={summary.overallProgress} size="sm" />
          </div>
        </div>
      </div>
      <div className="card p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ore Totali</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalHoursLogged}h</p>
      </div>
    </div>
  )
}

/**
 * Main TaskTreeView component
 */
export function TaskTreeView({
  mode = 'full',
  myTasksOnly: propMyTasksOnly,
  filterUserId: propFilterUserId,
  excludeCompleted: propExcludeCompleted,
  showSummary = true,
  showControls = true,
  showFilters = false,
  maxDepth = 0,
  projectId,
  parentTaskId,
  skipProjectLevel = false,
  onTimerToggle,
  runningTimerId,
  canTrackTime = false,
  className = '',
}: TaskTreeViewProps) {
  const {
    treeData,
    expandedProjects,
    expandedMilestones,
    expandedTasks,
    isLoading,
    error,
    myTasksOnly,
    filterUserId,
    excludeCompleted,
    fetchTaskTree,
    toggleProject,
    toggleMilestone,
    toggleTask,
    expandAll,
    collapseAll,
    setMyTasksOnly,
    setExcludeCompleted,
    clearError,
  } = useTaskTreeStore()

  const compact = mode === 'compact'

  useEffect(() => {
    fetchTaskTree({
      projectId,
      parentTaskId,
      myTasksOnly: propMyTasksOnly ?? myTasksOnly,
      filterUserId: propFilterUserId ?? filterUserId ?? undefined,
      excludeCompleted: propExcludeCompleted ?? excludeCompleted,
    })
  }, [fetchTaskTree, projectId, parentTaskId, propMyTasksOnly, propFilterUserId, propExcludeCompleted])

  if (isLoading && !treeData) {
    return (
      <div className={`flex items-center justify-center ${compact ? 'h-32' : 'h-64'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button onClick={clearError} className="text-sm text-red-500 underline mt-1">
          Chiudi
        </button>
      </div>
    )
  }

  // Subtask mode (parentTaskId)
  if (parentTaskId) {
    const subtasks = treeData?.subtasks
    if (!subtasks || subtasks.length === 0) {
      return <EmptyState icon={CheckSquare} title="Nessun subtask" compact={compact} />
    }

    return (
      <div className={className}>
        {subtasks.map((subtask) => (
          <SubtaskNodeItem
            key={subtask.id}
            subtask={subtask}
            level={0}
            isExpanded={expandedTasks.has(subtask.id)}
            onToggle={toggleTask}
            expandedTasks={expandedTasks}
            maxDepth={maxDepth}
            compact={compact}
            onTimerToggle={onTimerToggle}
            runningTimerId={runningTimerId}
            canTrackTime={canTrackTime}
          />
        ))}
      </div>
    )
  }

  if (!treeData || treeData.projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Nessun task disponibile"
        description={!compact ? "I task a cui hai accesso appariranno qui" : undefined}
        compact={compact}
      />
    )
  }

  // Skip project level: render milestones/tasks directly from first project
  if (skipProjectLevel && treeData.projects.length > 0) {
    const project = treeData.projects[0]
    const hasMilestones = project.milestones && project.milestones.length > 0
    const hasTasks = project.tasks && project.tasks.length > 0

    if (!hasMilestones && !hasTasks) {
      return (
        <EmptyState icon={CheckSquare} title="Nessun task in questo progetto" compact />
      )
    }

    return (
      <div className={className}>
        {hasMilestones &&
          project.milestones.map((milestone) => (
            <MilestoneNodeItem
              key={milestone.id}
              milestone={milestone}
              isExpanded={expandedMilestones.has(milestone.id)}
              onToggle={() => toggleMilestone(milestone.id)}
              expandedTasks={expandedTasks}
              onToggleTask={toggleTask}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
            />
          ))}
        {hasTasks &&
          project.tasks.map((task) => (
            <TaskNodeItem
              key={task.id}
              task={task}
              isExpanded={expandedTasks.has(task.id)}
              onToggle={toggleTask}
              expandedTasks={expandedTasks}
              maxDepth={maxDepth}
              compact={compact}
              onTimerToggle={onTimerToggle}
              runningTimerId={runningTimerId}
              canTrackTime={canTrackTime}
            />
          ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      {showSummary && !compact && <SummaryCards summary={treeData.summary} />}

      {/* Controls */}
      {(showControls || showFilters) && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          {!compact && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BarChart3 className="w-4 h-4" />
              <span>Vista gerarchica progetti e task</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {showFilters && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propMyTasksOnly ?? myTasksOnly}
                    onChange={(e) => setMyTasksOnly(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Filter className="w-3.5 h-3.5" />
                  Solo i miei
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propExcludeCompleted ?? excludeCompleted}
                    onChange={(e) => setExcludeCompleted(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  Nascondi completati
                </label>
              </>
            )}

            {showControls && (
              <>
                <button
                  onClick={expandAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  {!compact && 'Espandi'}
                </button>
                <button
                  onClick={collapseAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  {!compact && 'Comprimi'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Project tree */}
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {treeData.projects.map((project) => (
          <ProjectNodeItem
            key={project.id}
            project={project}
            isExpanded={expandedProjects.has(project.id)}
            onToggle={() => toggleProject(project.id)}
            expandedMilestones={expandedMilestones}
            onToggleMilestone={toggleMilestone}
            expandedTasks={expandedTasks}
            onToggleTask={toggleTask}
            maxDepth={maxDepth}
            compact={compact}
            onTimerToggle={onTimerToggle}
            runningTimerId={runningTimerId}
            canTrackTime={canTrackTime}
          />
        ))}
      </div>
    </div>
  )
}
