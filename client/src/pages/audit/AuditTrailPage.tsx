/**
 * Audit Trail Page - Displays audit log entries with filters and expandable details
 * @module pages/audit/AuditTrailPage
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  Filter,
  RefreshCw,
  User,
  Calendar,
  Search,
} from 'lucide-react'
import { useAuditStore } from '@stores/auditStore'
import type { AuditEntityType, AuditActionType, AuditLog } from '@stores/auditStore'
import { useUserStore } from '@stores/userStore'
import { Pagination } from '@components/common/Pagination'

// ============================================================
// CONSTANTS
// ============================================================

const ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  user: 'Utente',
  project: 'Progetto',
  task: 'Task',
  risk: 'Rischio',
  document: 'Documento',
  comment: 'Commento',
  time_entry: 'Time Entry',
  user_input: 'Segnalazione',
  note: 'Nota',
  attachment: 'Allegato',
  tag: 'Tag',
}

const ACTION_LABELS: Record<AuditActionType, string> = {
  create: 'Creazione',
  update: 'Modifica',
  delete: 'Eliminazione',
  status_change: 'Cambio Stato',
  login: 'Login',
  logout: 'Logout',
}

const ACTION_COLORS: Record<AuditActionType, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  status_change: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

const ENTITY_TYPE_OPTIONS: { value: AuditEntityType | ''; label: string }[] = [
  { value: '', label: 'Tutti i tipi' },
  { value: 'project', label: 'Progetto' },
  { value: 'task', label: 'Task' },
  { value: 'risk', label: 'Rischio' },
  { value: 'document', label: 'Documento' },
  { value: 'user', label: 'Utente' },
  { value: 'comment', label: 'Commento' },
  { value: 'time_entry', label: 'Time Entry' },
  { value: 'user_input', label: 'Segnalazione' },
  { value: 'note', label: 'Nota' },
  { value: 'attachment', label: 'Allegato' },
  { value: 'tag', label: 'Tag' },
]

const ACTION_OPTIONS: { value: AuditActionType | ''; label: string }[] = [
  { value: '', label: 'Tutte le azioni' },
  { value: 'create', label: 'Creazione' },
  { value: 'update', label: 'Modifica' },
  { value: 'delete', label: 'Eliminazione' },
  { value: 'status_change', label: 'Cambio Stato' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
]

// ============================================================
// HELPER UTILITIES
// ============================================================

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function parseJsonSafe(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

interface DiffValueProps {
  value: unknown
}

function DiffValue({ value }: DiffValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 italic">null</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {String(value)}
      </span>
    )
  }
  if (typeof value === 'object') {
    return (
      <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">
        {JSON.stringify(value, null, 2)}
      </span>
    )
  }
  return (
    <span className="text-gray-700 dark:text-gray-300">
      {String(value)}
    </span>
  )
}

interface DataDiffProps {
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
}

function DataDiff({ oldData, newData }: DataDiffProps) {
  const allKeys = new Set([
    ...Object.keys(oldData ?? {}),
    ...Object.keys(newData ?? {}),
  ])

  if (allKeys.size === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nessun dato disponibile.</p>
    )
  }

  const changedKeys: string[] = []
  const unchangedKeys: string[] = []

  for (const key of allKeys) {
    const oldVal = oldData?.[key]
    const newVal = newData?.[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedKeys.push(key)
    } else {
      unchangedKeys.push(key)
    }
  }

  return (
    <div className="space-y-3">
      {changedKeys.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Campi modificati
          </p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-1/4">Campo</th>
                  <th className="px-3 py-2 text-left font-medium text-red-600 dark:text-red-400 w-[37.5%]">Precedente</th>
                  <th className="px-3 py-2 text-left font-medium text-green-600 dark:text-green-400 w-[37.5%]">Nuovo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {changedKeys.map((key) => (
                  <tr key={key} className="bg-white dark:bg-gray-800">
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 align-top">
                      {key}
                    </td>
                    <td className="px-3 py-2 bg-red-50 dark:bg-red-900/10 align-top break-all">
                      <DiffValue value={oldData?.[key]} />
                    </td>
                    <td className="px-3 py-2 bg-green-50 dark:bg-green-900/10 align-top break-all">
                      <DiffValue value={newData?.[key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unchangedKeys.length > 0 && changedKeys.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Mostra {unchangedKeys.length} campi invariati
          </summary>
          <div className="mt-2 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {unchangedKeys.map((key) => (
                  <tr key={key} className="bg-gray-50 dark:bg-gray-800/50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-gray-500 w-1/4">
                      {key}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-500 break-all">
                      <DiffValue value={oldData?.[key] ?? newData?.[key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {changedKeys.length === 0 && (
        <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-1/3">Campo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Valore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {unchangedKeys.map((key) => (
                <tr key={key} className="bg-white dark:bg-gray-800">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 align-top">
                    {key}
                  </td>
                  <td className="px-3 py-2 break-all align-top">
                    <DiffValue value={oldData?.[key] ?? newData?.[key]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface AuditRowProps {
  log: AuditLog
  isExpanded: boolean
  onToggle: () => void
}

function AuditRow({ log, isExpanded, onToggle }: AuditRowProps) {
  const oldData = parseJsonSafe(log.oldData)
  const newData = parseJsonSafe(log.newData)
  const hasDetail = log.oldData !== null || log.newData !== null

  return (
    <>
      <tr
        className={`transition-colors ${
          isExpanded
            ? 'bg-primary-50/50 dark:bg-primary-900/10'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        {/* Data/Ora */}
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </td>

        {/* Utente */}
        <td className="px-4 py-3">
          {log.user ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">
                  {log.user.firstName[0]}{log.user.lastName[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                  {log.user.firstName} {log.user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{log.user.email}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">Sistema</span>
          )}
        </td>

        {/* Azione */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action]}`}>
            {ACTION_LABELS[log.action]}
          </span>
        </td>

        {/* Tipo Entità */}
        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
        </td>

        {/* ID Entità */}
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate block" title={log.entityId}>
            {log.entityId}
          </span>
        </td>

        {/* Dettagli */}
        <td className="px-4 py-3">
          {hasDetail ? (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isExpanded ? 'Comprimi dettagli' : 'Espandi dettagli'}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {isExpanded ? 'Chiudi' : 'Dettagli'}
            </button>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
          )}
        </td>
      </tr>

      {isExpanded && hasDetail && (
        <tr className="bg-primary-50/30 dark:bg-primary-900/5">
          <td colSpan={6} className="px-4 py-4">
            <div className="max-w-4xl">
              <DataDiff oldData={oldData} newData={newData} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ============================================================
// SKELETON
// ============================================================

function AuditSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-6 w-16 rounded-full" />
        </div>
        <div className="skeleton h-9 w-24 rounded-lg" />
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-7 w-32 rounded" />
              <div className="skeleton h-5 w-20 rounded-full" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-24 font-mono" />
              <div className="skeleton h-6 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function AuditTrailPage() {
  const { logs, pagination, isLoading, error, fetchAuditLogs } = useAuditStore()
  const { users, fetchUsers } = useUserStore()

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filter state
  const [entityType, setEntityType] = useState<AuditEntityType | ''>('')
  const [action, setAction] = useState<AuditActionType | ''>('')
  const [userId, setUserId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(true)

  // Load users for the dropdown (we need all of them for the filter)
  useEffect(() => {
    fetchUsers({ limit: 200 })
  }, [fetchUsers])

  // Initial load
  useEffect(() => {
    fetchAuditLogs({ page: 1, limit: 50 })
  }, [fetchAuditLogs])

  const buildFilters = useCallback(
    (page = 1) => ({
      page,
      limit: 50,
      entityType: entityType || undefined,
      action: action || undefined,
      userId: userId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [entityType, action, userId, startDate, endDate]
  )

  const handleApplyFilters = () => {
    setExpandedRows(new Set())
    fetchAuditLogs(buildFilters(1))
  }

  const handleClearFilters = () => {
    setEntityType('')
    setAction('')
    setUserId('')
    setStartDate('')
    setEndDate('')
    setExpandedRows(new Set())
    fetchAuditLogs({ page: 1, limit: 50 })
  }

  const handlePageChange = (page: number) => {
    setExpandedRows(new Set())
    fetchAuditLogs(buildFilters(page))
  }

  const handleRefresh = () => {
    setExpandedRows(new Set())
    fetchAuditLogs(buildFilters(pagination.page))
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasActiveFilters = !!(entityType || action || userId || startDate || endDate)

  if (isLoading && logs.length === 0) {
    return <AuditSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Registro Audit
            </h1>
            {pagination.total > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {pagination.total.toLocaleString('it-IT')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-label={showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
            className="btn-secondary flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtri</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Aggiorna"
            disabled={isLoading}
            className="btn-icon"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Entity type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Tipo entita
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as AuditEntityType | '')}
                className="input w-full"
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Azione
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as AuditActionType | '')}
                className="input w-full"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <User className="w-3 h-3 inline mr-1" />
                Utente
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input w-full"
              >
                <option value="">Tutti gli utenti</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Data da
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Data a
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Buttons */}
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-3 flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={isLoading}
                className="btn-primary flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Applica
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-secondary flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancella
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {logs.length === 0 && !isLoading ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nessun log trovato
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? 'Nessun log corrisponde ai filtri selezionati. Prova a modificarli.'
              : 'Il registro audit è vuoto.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary mt-4 inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancella filtri
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            {/* Loading overlay for subsequent fetches */}
            {isLoading && logs.length > 0 && (
              <div className="h-1 w-full bg-primary-100 dark:bg-primary-900/20">
                <div className="h-full bg-primary-500 animate-pulse rounded-full" />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      Data/Ora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Utente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Azione
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      Tipo Entita
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      ID Entita
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Dettagli
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {logs.map((log) => (
                    <AuditRow
                      key={log.id}
                      log={log}
                      isExpanded={expandedRows.has(log.id)}
                      onToggle={() => toggleRow(log.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
