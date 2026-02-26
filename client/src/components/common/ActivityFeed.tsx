/**
 * ActivityFeed - Displays a timeline of audit log entries for a task or project
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, ArrowRight, Trash2, LogIn, LogOut, Loader2 } from 'lucide-react'
import api from '@services/api'
import { TASK_STATUS_LABELS } from '@/constants'
import { formatRelativeTime } from '@utils/dateFormatters'

interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  oldData: string | null
  newData: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface ActivityFeedProps {
  entityType: 'task' | 'project'
  entityId: string
  projectId?: string
  limit?: number
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Edit2,
  status_change: ArrowRight,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  update: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  status_change: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  delete: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Creazione',
  update: 'Modifica',
  status_change: 'Cambio stato',
  delete: 'Eliminazione',
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Titolo',
  description: 'Descrizione',
  status: 'Stato',
  priority: 'Priorita\'',
  assigneeId: 'Assegnatario',
  dueDate: 'Scadenza',
  startDate: 'Data inizio',
  estimatedHours: 'Ore stimate',
  actualHours: 'Ore effettive',
  taskType: 'Tipo',
  blockedReason: 'Motivo blocco',
  projectId: 'Progetto',
  parentTaskId: 'Task padre',
  departmentId: 'Reparto',
  name: 'Nome',
  targetEndDate: 'Data obiettivo',
  budget: 'Budget',
  ownerId: 'Responsabile',
}

function parseJsonSafe(str: string | null): Record<string, unknown> | null {
  if (!str) return null
  try {
    return JSON.parse(str) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatStatusValue(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '-')
  return (TASK_STATUS_LABELS as Record<string, string>)[value] ?? value
}

function getChangeSummary(entry: AuditLogEntry): string {
  const oldData = parseJsonSafe(entry.oldData)
  const newData = parseJsonSafe(entry.newData)

  if (entry.action === 'status_change' && oldData && newData) {
    const from = formatStatusValue(oldData.status)
    const to = formatStatusValue(newData.status)
    return `${from} \u2192 ${to}`
  }

  if (entry.action === 'create') {
    const data = newData
    if (data?.title) return `"${data.title}"`
    return ''
  }

  if (entry.action === 'update' && oldData && newData) {
    const changes: string[] = []
    for (const key of Object.keys(newData)) {
      if (key === 'updatedAt' || key === 'createdAt') continue
      const oldVal = oldData[key]
      const newVal = newData[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        const label = FIELD_LABELS[key] ?? key
        if (key === 'status') {
          changes.push(`${label}: ${formatStatusValue(oldVal)} \u2192 ${formatStatusValue(newVal)}`)
        } else {
          changes.push(label)
        }
      }
    }
    return changes.slice(0, 3).join(', ') + (changes.length > 3 ? ` +${changes.length - 3}` : '')
  }

  return ''
}

export default function ActivityFeed({ entityType, entityId, projectId, limit = 15 }: ActivityFeedProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [displayLimit, setDisplayLimit] = useState(limit)

  const fetchActivity = useCallback(async () => {
    setIsLoading(true)
    try {
      let url: string
      if (entityType === 'project' && projectId) {
        url = `/audit/project/${projectId}?limit=${displayLimit}`
      } else {
        url = `/audit/entity/${entityType}/${entityId}?limit=${displayLimit}`
      }
      const response = await api.get<{ success: boolean; data: AuditLogEntry[] }>(url)
      if (response.data.success) {
        setEntries(response.data.data)
      }
    } catch {
      // Silent fail - activity feed is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId, projectId, displayLimit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Caricamento attivita'...</span>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
        Nessuna attivita' registrata
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, index) => {
        const Icon = ACTION_ICONS[entry.action] ?? Edit2
        const colorClass = ACTION_COLORS[entry.action] ?? ACTION_COLORS.update
        const actionLabel = ACTION_LABELS[entry.action] ?? entry.action
        const summary = getChangeSummary(entry)
        const isLast = index === entries.length - 1

        return (
          <div key={entry.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[15px] top-9 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Sistema'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {actionLabel}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto flex-shrink-0">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
              {summary && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                  {summary}
                </p>
              )}
            </div>
          </div>
        )
      })}

      {/* Load more */}
      {entries.length >= displayLimit && (
        <button
          onClick={() => setDisplayLimit((prev) => prev + 15)}
          className="w-full py-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          Carica altro
        </button>
      )}
    </div>
  )
}
