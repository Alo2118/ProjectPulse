/**
 * Time Tracking Page - View and manage time entries
 * @module pages/time-tracking/TimeTrackingPage
 */

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStore } from '@stores/dashboardStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import { useAuthStore } from '@stores/authStore'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import {
  Clock,
  Play,
  Loader2,
  FolderKanban,
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Pagination } from '@components/common/Pagination'
import { TimeEntry, PaginatedResponse } from '@/types'
import TimeEntryFormModal from './TimeEntryFormModal'
import { TimeEntryDetailModal } from './TimeEntryDetailModal'
import TaskSearchSelect from '@components/TaskSearchSelect'
import { RunningTimerBanner } from '@/components/ui/RunningTimerBanner'

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Oggi'
  if (date.toDateString() === yesterday.toDateString()) return 'Ieri'

  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

export default function TimeTrackingPage() {
  const { runningTimer, fetchRunningTimer, startTimer, stopTimer } = useDashboardStore()
  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()
  const { user: currentUser, token } = useAuthStore()

  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'direzione'

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingTimer, setIsStartingTimer] = useState(false)

  // Filters - default to last 10 days
  const [projectFilter, setProjectFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  // Manual entry modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Detail modal
  const [viewingEntry, setViewingEntry] = useState<TimeEntry | null>(null)

  // Task selection for starting timer
  const [selectedTaskId, setSelectedTaskId] = useState('')

  // CSV export
  const [isExporting, setIsExporting] = useState(false)

  const fetchTimeEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', String(pagination.page))
      params.append('limit', String(pagination.limit))
      if (projectFilter) params.append('projectId', projectFilter)
      if (userFilter) params.append('userId', userFilter)
      if (dateFrom) params.append('fromDate', dateFrom)
      if (dateTo) params.append('toDate', dateTo)

      const response = await api.get<{ success: boolean } & PaginatedResponse<TimeEntry>>(
        `/time-entries?${params.toString()}`
      )

      if (response.data.success !== false) {
        setTimeEntries(response.data.data)
        setPagination(response.data.pagination)
      }
    } catch {
      // silently ignore
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, projectFilter, userFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchRunningTimer()
    fetchProjects()
    if (isPrivileged) fetchUsers()
  }, [fetchRunningTimer, fetchProjects, isPrivileged, fetchUsers])

  useEffect(() => {
    fetchTimeEntries()
  }, [fetchTimeEntries])

  const handleStopTimer = async () => {
    try {
      await stopTimer()
      fetchTimeEntries()
    } catch {
      // silently ignore
    }
  }

  const handleStartTimer = async () => {
    if (!selectedTaskId) return
    setIsStartingTimer(true)
    try {
      await startTimer(selectedTaskId)
      setSelectedTaskId('')
    } catch {
      // silently ignore
    } finally {
      setIsStartingTimer(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleFormSuccess = () => {
    fetchTimeEntries()
  }

  const handleExportCSV = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (projectFilter) params.append('projectId', projectFilter)
      if (userFilter) params.append('userId', userFilter)
      if (dateFrom) params.append('startDate', dateFrom)
      if (dateTo) params.append('endDate', dateTo)

      const response = await fetch(`/api/time-entries/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date().toISOString().split('T')[0]
      a.download = `time-entries-${today}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore', 'Impossibile esportare le ore')
    } finally {
      setIsExporting(false)
    }
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setIsFormModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingEntryId || isDeleting) return
    setIsDeleting(true)
    try {
      await api.delete(`/time-entries/${deletingEntryId}`)
      setDeletingEntryId(null)
      fetchTimeEntries()
    } catch {
      setDeletingEntryId(null) // Close modal on error too
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter out the active running timer (shown in banner) and group by date
  const filteredEntries = runningTimer
    ? timeEntries.filter(e => e.id !== runningTimer.id)
    : timeEntries

  const entriesByDate = filteredEntries.reduce(
    (acc, entry) => {
      const date = new Date(entry.startTime).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(entry)
      return acc
    },
    {} as Record<string, TimeEntry[]>
  )

  // Calculate total hours (from filtered entries only)
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Registro Ore</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Registra e monitora il tempo dedicato ai task
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {isPrivileged && (
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Esporta CSV"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <span className="hidden sm:inline">Esporta CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingEntry(null)
              setIsFormModalOpen(true)
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Registra manualmente</span>
            <span className="sm:hidden">Registra</span>
          </button>
        </div>
      </div>

      {/* Running Timer Banner */}
      {runningTimer && (
        <RunningTimerBanner timer={runningTimer} onStop={handleStopTimer} />
      )}

      {/* Timer + Filters (unified card) */}
      <div className="card p-4 space-y-4 overflow-visible relative z-10">
        {/* Start timer row */}
        {!runningTimer && (
          <div className="flex gap-3 items-center">
            <div className="flex-1 min-w-0">
              <TaskSearchSelect
                value={selectedTaskId}
                onChange={setSelectedTaskId}
                statusFilter="todo,in_progress,review"
              />
            </div>
            <button
              onClick={handleStartTimer}
              disabled={!selectedTaskId || isStartingTimer}
              className="btn-primary flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingTimer ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Avvia Timer
            </button>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="input w-auto"
          >
            <option value="">Tutti i progetti</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
          {isPrivileged && (
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="input w-auto"
            >
              <option value="">Tutti gli utenti</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">Da:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="input w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400">A:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="input w-auto"
            />
          </div>
          {(projectFilter || userFilter) && (
            <button
              onClick={() => {
                setProjectFilter('')
                setUserFilter('')
                setDateFrom(() => {
                  const d = new Date(); d.setDate(d.getDate() - 10)
                  return d.toISOString().split('T')[0]
                })
                setDateTo(new Date().toISOString().split('T')[0])
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Resetta filtri
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-primary-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Totale pagina</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatDuration(totalMinutes)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <CheckSquare className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Registrazioni</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center">
            <FolderKanban className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Progetti</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {new Set(filteredEntries.map((e) => e.task?.project?.id)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries List */}
      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registrazioni Tempo
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nessuna registrazione
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {projectFilter || dateFrom || dateTo
                ? 'Nessuna registrazione corrisponde ai filtri selezionati'
                : 'Inizia a tracciare il tempo sui tuoi task'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(entriesByDate).map(([date, entries]) => (
              <div key={date}>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formatDateShort(entries[0].startTime)} - {formatDate(entries[0].startTime)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDuration(entries.reduce((sum, e) => sum + (e.duration || 0), 0))}
                    </span>
                  </div>
                </div>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setViewingEntry(entry)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Project + Task info - wrap on mobile */}
                      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Link
                          to={`/projects/${entry.task?.project?.id}`}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {entry.task?.project?.name}
                        </Link>
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {entry.task?.title}
                        </span>
                        {entry.description && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic truncate hidden sm:inline" title={entry.description}>
                            — {entry.description}
                          </span>
                        )}
                        {isPrivileged && entry.user && (
                          <span className="text-[11px] text-gray-400/80 dark:text-gray-500/80 shrink-0 hidden sm:inline">
                            [{entry.user.firstName} {entry.user.lastName}]
                          </span>
                        )}
                        {/* Approval status badge */}
                        {!entry.isRunning && (
                          <span
                            className={`hidden sm:inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full shrink-0 ${
                              entry.approvalStatus === 'approved'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : entry.approvalStatus === 'rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {entry.approvalStatus === 'approved' ? (
                              <><CheckCircle className="w-2.5 h-2.5" /> Approvata</>
                            ) : entry.approvalStatus === 'rejected' ? (
                              <><XCircle className="w-2.5 h-2.5" /> Rifiutata</>
                            ) : (
                              <><AlertCircle className="w-2.5 h-2.5" /> In attesa</>
                            )}
                          </span>
                        )}
                      </div>
                      {/* Time info */}
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0 hidden sm:inline">
                        {formatTime(entry.startTime)}
                        {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                      </span>
                      {/* Duration */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap shrink-0 w-14 sm:w-16 text-right">
                        {formatDuration(entry.duration)}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                        {!entry.isRunning && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-primary-600"
                            title="Modifica"
                          >
                            <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {(!entry.isRunning || (entry.isRunning && entry.id !== runningTimer?.id)) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingEntryId(entry.id); }}
                            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600"
                            title={entry.isRunning ? "Elimina timer orfano" : "Elimina"}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={handlePageChange}
          className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"
        />
      </div>

      {/* Form Modal */}
      <TimeEntryFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingEntry(null)
        }}
        onSuccess={handleFormSuccess}
        entry={editingEntry}
      />

      {/* Delete Confirmation */}
      {deletingEntryId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setDeletingEntryId(null)}
            />
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Elimina Registrazione
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sei sicuro di voler eliminare questa registrazione? L'azione non è reversibile.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingEntryId(null)}
                  className="btn-secondary"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <TimeEntryDetailModal
        isOpen={!!viewingEntry}
        entry={viewingEntry}
        onClose={() => setViewingEntry(null)}
      />
    </div>
  )
}
