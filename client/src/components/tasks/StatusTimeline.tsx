/**
 * StatusTimeline - Compact horizontal timeline showing status changes with duration
 */

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@services/api'
import { useWorkflowStore } from '@stores/workflowStore'

interface StatusChangeEntry {
  id: string
  oldData: string | null
  newData: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface StatusTimelineProps {
  entityId: string
  projectId?: string | null
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-400 dark:bg-gray-500',
  in_progress: 'bg-blue-500 dark:bg-blue-400',
  review: 'bg-yellow-500 dark:bg-yellow-400',
  blocked: 'bg-red-500 dark:bg-red-400',
  done: 'bg-green-500 dark:bg-green-400',
  cancelled: 'bg-gray-300 dark:bg-gray-600',
}

function parseStatus(jsonStr: string | null): string {
  if (!jsonStr) return 'unknown'
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    return (parsed.status as string) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}g ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  const minutes = Math.floor(ms / 60000)
  return `${minutes}min`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface StatusSegment {
  status: string
  label: string
  startTime: Date
  endTime: Date | null
  duration: number
  user: string
}

export default function StatusTimeline({ entityId, projectId }: StatusTimelineProps) {
  const [segments, setSegments] = useState<StatusSegment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const { getStatusLabel } = useWorkflowStore()

  useEffect(() => {
    const fetchTimeline = async () => {
      setIsLoading(true)
      try {
        const response = await api.get<{ success: boolean; data: StatusChangeEntry[] }>(
          `/audit/timeline/${entityId}`
        )
        if (response.data.success && response.data.data.length > 0) {
          const entries = response.data.data
          const result: StatusSegment[] = []

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const fromStatus = parseStatus(entry.oldData)
            const toStatus = parseStatus(entry.newData)
            const startTime = new Date(entry.createdAt)
            const endTime = i < entries.length - 1 ? new Date(entries[i + 1].createdAt) : null
            const duration = endTime ? endTime.getTime() - startTime.getTime() : Date.now() - startTime.getTime()
            const effectiveProjectId = projectId ?? ''

            // For the first entry, add the "from" status as starting segment
            if (i === 0 && fromStatus !== 'unknown') {
              result.push({
                status: fromStatus,
                label: getStatusLabel(effectiveProjectId, fromStatus),
                startTime: new Date(0), // unknown start
                endTime: startTime,
                duration: 0, // unknown
                user: '',
              })
            }

            result.push({
              status: toStatus,
              label: getStatusLabel(effectiveProjectId, toStatus),
              startTime,
              endTime,
              duration,
              user: entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : '',
            })
          }

          setSegments(result)
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeline()
  }, [entityId, projectId, getStatusLabel])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Caricamento timeline...</span>
      </div>
    )
  }

  if (segments.length === 0) {
    return null
  }

  // Calculate total duration for proportional width
  const totalDuration = segments.reduce((sum, s) => sum + (s.duration > 0 ? s.duration : 1), 0)

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Cronologia stato
      </h4>

      {/* Timeline bar */}
      <div className="flex rounded-full overflow-hidden h-3 bg-gray-100 dark:bg-gray-800 relative">
        {segments.filter(s => s.duration > 0 || s.endTime === null).map((segment, index) => {
          const widthPercent = Math.max((segment.duration / totalDuration) * 100, 3) // min 3% for visibility
          const colorClass = STATUS_COLORS[segment.status] ?? 'bg-gray-400 dark:bg-gray-500'

          return (
            <div
              key={`${segment.status}-${index}`}
              className={`relative ${colorClass} transition-opacity cursor-pointer ${
                hoveredIndex !== null && hoveredIndex !== index ? 'opacity-50' : ''
              }`}
              style={{ width: `${widthPercent}%`, minWidth: '8px' }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          )
        })}
      </div>

      {/* Tooltip */}
      {hoveredIndex !== null && segments[hoveredIndex] && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-sm text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[segments[hoveredIndex].status] ?? 'bg-gray-400'}`} />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {segments[hoveredIndex].label}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-auto">
              {segments[hoveredIndex].duration > 0 ? formatDuration(segments[hoveredIndex].duration) : '-'}
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {formatDateTime(segments[hoveredIndex].startTime.toISOString())}
            {segments[hoveredIndex].endTime && (
              <> &rarr; {formatDateTime(segments[hoveredIndex].endTime.toISOString())}</>
            )}
          </div>
          {segments[hoveredIndex].user && (
            <div className="text-gray-400 dark:text-gray-500">
              da {segments[hoveredIndex].user}
            </div>
          )}
        </div>
      )}

      {/* Legend dots */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {segments.filter(s => s.duration > 0 || s.endTime === null).map((segment, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[segment.status] ?? 'bg-gray-400'}`} />
            <span>{segment.label}</span>
            {segment.duration > 0 && (
              <span className="text-gray-400 dark:text-gray-500">
                ({formatDuration(segment.duration)})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
