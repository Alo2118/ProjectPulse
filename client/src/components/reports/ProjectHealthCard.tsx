/**
 * Project Health Card - Displays project health metrics with task detail
 * @module components/reports/ProjectHealthCard
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flag,
  Calendar,
} from 'lucide-react'
import { CircularProgress } from './CircularProgress'
import type { ProjectHealthStatus, TaskBrief } from '@/types'
import { formatDateShort, formatHoursFromDecimal } from '@utils/dateFormatters'

interface CompletedTask extends TaskBrief {
  completedAt: string
}

interface InProgressTask extends TaskBrief {
  dueDate: string | null
  isOverdue: boolean
}

interface BlockedTask extends TaskBrief {
  blockedReason: string | null
  daysBlocked: number
}

interface ProjectHealthCardProps {
  projectId: string
  name: string
  code?: string
  status: ProjectHealthStatus | 'delayed'
  completion: number
  tasks: {
    total: number
    completed: number
    blocked: number
    inProgress: number
  }
  hours: number
  nearestMilestone?: {
    title: string
    dueDate: string | null
    daysLeft: number | null
  } | null
  completedThisWeek?: CompletedTask[]
  inProgressTasks?: InProgressTask[]
  blockedTasksList?: BlockedTask[]
}


export function ProjectHealthCard({
  projectId,
  name,
  status,
  completion,
  tasks,
  hours,
  nearestMilestone,
  completedThisWeek = [],
  inProgressTasks = [],
  blockedTasksList = [],
}: ProjectHealthCardProps) {
  const [expanded, setExpanded] = useState(false)

  const getStatusBadge = () => {
    switch (status) {
      case 'on-track':
        return {
          text: 'On Track',
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          icon: TrendingUp,
        }
      case 'at-risk':
        return {
          text: 'A Rischio',
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          icon: AlertCircle,
        }
      case 'off-track':
      case 'delayed':
        return {
          text: 'In Ritardo',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: TrendingDown,
        }
      default:
        return {
          text: 'Sconosciuto',
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
          icon: AlertCircle,
        }
    }
  }

  const statusBadge = getStatusBadge()
  const StatusIcon = statusBadge.icon
  const circleColor =
    status === 'on-track' ? '#10b981' :
    status === 'at-risk' ? '#f59e0b' : '#ef4444'

  const hasDetails = completedThisWeek.length > 0 || inProgressTasks.length > 0 || blockedTasksList.length > 0 || nearestMilestone

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <FolderOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <Link
                to={`/projects/${projectId}`}
                className="font-semibold text-gray-900 dark:text-white hover:text-primary-500 transition-colors truncate"
              >
                {name}
              </Link>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge.color}`}>
            <StatusIcon className="w-3 h-3" />
            <span className="hidden sm:inline">{statusBadge.text}</span>
          </div>
        </div>

        {/* Progress + Stats */}
        <div className="flex items-center gap-4 mb-4">
          <CircularProgress
            percentage={completion}
            size={80}
            strokeWidth={6}
            color={circleColor}
            showPercentage
          />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Completati</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{tasks.completed}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">In Corso</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{tasks.inProgress}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Bloccati</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{tasks.blocked}</span>
            </div>
          </div>
        </div>

        {/* Footer: hours + expand toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatHoursFromDecimal(hours)} questa settimana</span>
          </div>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
            >
              {expanded ? (
                <>Nascondi <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Dettagli <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail sections */}
      {expanded && hasDetails && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 pb-5 space-y-4 pt-4">

          {/* Next milestone */}
          {nearestMilestone && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
              <Flag className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
                  Prossima milestone
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
                  {nearestMilestone.title}
                </p>
                {nearestMilestone.dueDate && (
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                    nearestMilestone.daysLeft !== null && nearestMilestone.daysLeft < 0
                      ? 'text-red-600 dark:text-red-400'
                      : nearestMilestone.daysLeft !== null && nearestMilestone.daysLeft <= 7
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {formatDateShort(nearestMilestone.dueDate)}
                    {nearestMilestone.daysLeft !== null && (
                      <span>
                        {nearestMilestone.daysLeft < 0
                          ? ` (scaduta da ${Math.abs(nearestMilestone.daysLeft)} gg)`
                          : nearestMilestone.daysLeft === 0
                          ? ' (oggi!)'
                          : ` (tra ${nearestMilestone.daysLeft} gg)`}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Completed this week */}
          {completedThisWeek.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completato questa settimana ({completedThisWeek.length})
              </h5>
              <ul className="space-y-1.5">
                {completedThisWeek.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${t.id}`}
                        className="text-gray-800 dark:text-gray-200 hover:text-primary-500 transition-colors font-medium line-through decoration-gray-400"
                      >
                        {t.title}
                      </Link>
                      {t.assigneeName && (
                        <span className="text-gray-400 ml-1">— {t.assigneeName}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* In progress (remaining) */}
          {inProgressTasks.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Da completare ({inProgressTasks.length})
              </h5>
              <ul className="space-y-1.5">
                {inProgressTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                      t.isOverdue ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/tasks/${t.id}`}
                        className="text-gray-800 dark:text-gray-200 hover:text-primary-500 transition-colors font-medium"
                      >
                        {t.title}
                      </Link>
                      {t.assigneeName && (
                        <span className="text-gray-400 ml-1">— {t.assigneeName}</span>
                      )}
                      {t.dueDate && (
                        <span className={`ml-1 ${t.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          · scad. {formatDateShort(t.dueDate)}{t.isOverdue ? ' (scaduta)' : ''}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blocked */}
          {blockedTasksList.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Bloccati ({blockedTasksList.length})
              </h5>
              <ul className="space-y-2">
                {blockedTasksList.map((t) => (
                  <li key={t.id} className="p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/tasks/${t.id}`}
                          className="text-gray-800 dark:text-gray-200 hover:text-primary-500 transition-colors font-medium"
                        >
                          {t.title}
                        </Link>
                        {t.assigneeName && (
                          <span className="text-gray-400 ml-1">— {t.assigneeName}</span>
                        )}
                        <span className="ml-1 text-red-500">· bloccato da {t.daysBlocked}gg</span>
                        {t.blockedReason && (
                          <p className="text-gray-500 dark:text-gray-400 mt-0.5 italic">
                            "{t.blockedReason.substring(0, 80)}{t.blockedReason.length > 80 ? '...' : ''}"
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No activity this week */}
          {completedThisWeek.length === 0 && inProgressTasks.length === 0 && blockedTasksList.length === 0 && !nearestMilestone && (
            <p className="text-xs text-gray-400 text-center py-2">Nessuna attività registrata questa settimana</p>
          )}
        </div>
      )}
    </div>
  )
}
