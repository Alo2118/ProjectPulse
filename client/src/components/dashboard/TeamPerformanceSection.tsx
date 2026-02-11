/**
 * Team Performance Section - Team productivity metrics for direzione
 */

import { Users, TrendingUp, CheckSquare, Clock } from 'lucide-react'

interface TopContributor {
  userId: string
  firstName: string
  lastName: string
  minutesLogged: number
  tasksCompleted: number
}

interface TaskCompletionTrend {
  date: string
  completed: number
  created: number
}

interface TeamPerformanceSectionProps {
  topContributors: TopContributor[]
  completionTrend: TaskCompletionTrend[]
  isLoading?: boolean
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins > 0 ? `${mins}m` : ''}`
}

function getMaxValue(data: TaskCompletionTrend[]): number {
  return Math.max(...data.flatMap((d) => [d.completed, d.created]), 1)
}

export function TeamPerformanceSection({
  topContributors,
  completionTrend,
  isLoading,
}: TeamPerformanceSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-32 mb-1" />
                  <div className="skeleton h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    )
  }

  const maxMinutes = Math.max(...topContributors.map((c) => c.minutesLogged), 1)
  const maxTrend = getMaxValue(completionTrend)

  // Get last 14 days for the chart
  const recentTrend = completionTrend.slice(-14)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Contributors */}
      <div className="card">
        <div className="p-4 border-b border-gray-200/30 dark:border-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Top Contributors
          </h2>
        </div>
        <div className="p-4">
          {topContributors.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <span className="text-2xl block mb-2">{'\u{1F465}'}</span>
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <div key={contributor.userId} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                        : index === 1
                          ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                          : index === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800'
                            : 'bg-gradient-to-br from-gray-400 to-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {contributor.firstName} {contributor.lastName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatHours(contributor.minutesLogged)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" />
                          {contributor.tasksCompleted}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-surface-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
                        style={{
                          width: `${(contributor.minutesLogged / maxMinutes) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Completion Trend */}
      <div className="card">
        <div className="p-4 border-b border-gray-200/30 dark:border-white/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Trend Task (14 giorni)
          </h2>
        </div>
        <div className="p-4">
          {recentTrend.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <span className="text-2xl block mb-2">{'\u{1F4C8}'}</span>
              Nessun dato disponibile
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-32">
                {recentTrend.map((day) => {
                  const completedHeight = (day.completed / maxTrend) * 100
                  const createdHeight = (day.created / maxTrend) * 100
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-0.5 group relative"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          <p className="font-medium">
                            {new Date(day.date).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <p className="text-green-400">Completati: {day.completed}</p>
                          <p className="text-blue-400">Creati: {day.created}</p>
                        </div>
                      </div>
                      {/* Completed bar */}
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-green-500 to-emerald-400 transition-all duration-300"
                        style={{ height: `${completedHeight}%`, minHeight: day.completed > 0 ? '4px' : '0' }}
                      />
                      {/* Created bar (overlay) */}
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 opacity-50 transition-all duration-300"
                        style={{ height: `${createdHeight}%`, minHeight: day.created > 0 ? '4px' : '0' }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500 to-emerald-400" />
                  <span className="text-gray-600 dark:text-gray-400">Completati</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-400 opacity-50" />
                  <span className="text-gray-600 dark:text-gray-400">Creati</span>
                </div>
              </div>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200/30 dark:border-white/5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">
                    {recentTrend.reduce((sum, d) => sum + d.completed, 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Task completati</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">
                    {recentTrend.reduce((sum, d) => sum + d.created, 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Task creati</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
