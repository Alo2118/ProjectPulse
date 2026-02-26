/**
 * MyDayTomorrowPreview - Compact read-only preview of tomorrow's tasks
 * @module components/my-day/MyDayTomorrowPreview
 */

import { Link } from 'react-router-dom'
import { CalendarDays, Sunrise } from 'lucide-react'
import type { Task } from '@/types'

interface MyDayTomorrowPreviewProps {
  tasks: Task[]
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
}

const MAX_VISIBLE = 5

export function MyDayTomorrowPreview({ tasks }: MyDayTomorrowPreviewProps) {
  const visibleTasks = tasks.slice(0, MAX_VISIBLE)
  const remaining = tasks.length - MAX_VISIBLE

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          Domani
          {tasks.length > 0 && (
            <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className="p-6 text-center text-gray-400 dark:text-gray-500">
          <Sunrise className="w-7 h-7 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nessun task previsto per domani</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {visibleTasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT_COLORS[task.priority] ?? PRIORITY_DOT_COLORS.low}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {task.title}
                </p>
                {task.project && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {task.project.name}
                  </p>
                )}
              </div>
            </Link>
          ))}
          {remaining > 0 && (
            <div className="px-4 py-2 text-center">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                +{remaining} {remaining === 1 ? 'altro' : 'altri'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
