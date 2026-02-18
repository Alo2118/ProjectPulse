/**
 * Project Health Card - Displays project health metrics
 * @module components/reports/ProjectHealthCard
 */

import { FolderOpen, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { CircularProgress } from './CircularProgress'
import type { ProjectHealthStatus } from '@/types'

interface ProjectHealthCardProps {
  name: string
  status: ProjectHealthStatus | 'delayed'
  completion: number
  tasks: {
    total: number
    completed: number
    blocked: number
  }
  hours: number
}

export function ProjectHealthCard({ name, status, completion, tasks, hours }: ProjectHealthCardProps) {
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

  const inProgressCount = tasks.total - tasks.completed - tasks.blocked

  const circleColor =
    status === 'on-track' ? '#10b981' :
    status === 'at-risk' ? '#f59e0b' : '#ef4444'

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {name}
            </h4>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color} flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{statusBadge.text}</span>
        </div>
      </div>

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
            <span className="font-semibold text-green-600 dark:text-green-400">
              {tasks.completed}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">In Corso</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {Math.max(inProgressCount, 0)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Bloccati</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {tasks.blocked}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Ore Totali</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {hours.toFixed(1)}h
          </span>
        </div>
      </div>
    </div>
  )
}
