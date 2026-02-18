/**
 * Time Approval Page - Approve/reject pending time entries (admin/direzione only)
 * @module pages/time-tracking/TimeApprovalPage
 */

import { useEffect, useState, useCallback } from 'react'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import api from '@services/api'
import { toast } from '@stores/toastStore'
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FolderKanban,
  Filter,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react'
import { TimeEntry, PaginatedResponse } from '@/types'
import { Pagination } from '@components/common/Pagination'
import { ConfirmDialog } from '@components/common/ConfirmDialog'

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TimeApprovalPage() {
  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, pages: 0 })
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [projectFilter, setProjectFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Actions
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')

  const fetchPending = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '30',
      })
      if (projectFilter) params.append('projectId', projectFilter)
      if (userFilter) params.append('userId', userFilter)

      const res = await api.get<{ success: boolean; data: TimeEntry[]; pagination: PaginatedResponse<TimeEntry>['pagination'] }>(
        `/time-entries/pending?${params}`
      )
      if (res.data.success) {
        setEntries(res.data.data)
        setPagination(res.data.pagination as typeof pagination)
      }
    } catch {
      toast.error('Errore', 'Impossibile caricare le registrazioni in attesa')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, projectFilter, userFilter])

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [fetchProjects, fetchUsers])

  useEffect(() => {
    fetchPending()
    setSelectedIds(new Set())
  }, [fetchPending])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)))
    }
  }

  const handleApprove = async () => {
    if (selectedIds.size === 0) return
    setIsApproving(true)
    try {
      const res = await api.patch<{ success: boolean; data: { count: number } }>('/time-entries/approve', {
        ids: Array.from(selectedIds),
      })
      if (res.data.success) {
        toast.success('Approvate', `${res.data.data.count} registrazioni approvate`)
        setSelectedIds(new Set())
        fetchPending()
      }
    } catch {
      toast.error('Errore', 'Impossibile approvare le registrazioni')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (selectedIds.size === 0) return
    setIsRejecting(true)
    try {
      const res = await api.patch<{ success: boolean; data: { count: number } }>('/time-entries/reject', {
        ids: Array.from(selectedIds),
        rejectionNote: rejectionNote || undefined,
      })
      if (res.data.success) {
        toast.success('Rifiutate', `${res.data.data.count} registrazioni rifiutate`)
        setSelectedIds(new Set())
        setRejectionNote('')
        setRejectDialogOpen(false)
        fetchPending()
      }
    } catch {
      toast.error('Errore', 'Impossibile rifiutare le registrazioni')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleResetFilters = () => {
    setProjectFilter('')
    setUserFilter('')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" />
            Approvazione Ore
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Approva o rifiuta le registrazioni ore del team
          </p>
        </div>
        {pagination.total > 0 && (
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full self-start">
            <AlertCircle className="w-4 h-4" />
            {pagination.total} in attesa
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <Filter className="w-3 h-3 inline mr-1" />
              Progetto
            </label>
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1) }}
              className="input w-auto"
            >
              <option value="">Tutti i progetti</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Utente
            </label>
            <select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setCurrentPage(1) }}
              className="input w-auto"
            >
              <option value="">Tutti gli utenti</option>
              {users
                .filter((u) => u.isActive)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
            </select>
          </div>
          <button onClick={handleResetFilters} className="btn-secondary flex items-center">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-3 border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedIds.size} selezionate
          </span>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approva
          </button>
          <button
            onClick={() => setRejectDialogOpen(true)}
            disabled={isRejecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Rifiuta
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Deseleziona tutto
          </button>
        </div>
      )}

      {/* Entries table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Tutto in ordine!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Nessuna registrazione in attesa di approvazione
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/30 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <th className="p-3 w-10">
                  <button onClick={toggleSelectAll} className="p-0.5">
                    {selectedIds.size === entries.length ? (
                      <CheckSquare className="w-4 h-4 text-primary-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400">Utente</th>
                <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Task / Progetto</th>
                <th className="p-3 text-left font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Data</th>
                <th className="p-3 text-right font-medium text-gray-600 dark:text-gray-400">Durata</th>
                <th className="p-3 text-center font-medium text-gray-600 dark:text-gray-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${
                    selectedIds.has(entry.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                  }`}
                >
                  <td className="p-3">
                    <button onClick={() => toggleSelect(entry.id)} className="p-0.5">
                      {selectedIds.has(entry.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary-500" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {entry.user?.firstName?.[0]}{entry.user?.lastName?.[0]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.user?.firstName} {entry.user?.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                      {entry.task?.title || '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <FolderKanban className="w-3 h-3" />
                      {entry.task?.project?.name || '—'}
                    </p>
                    {entry.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5 truncate max-w-[200px]">
                        {entry.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">
                    {formatDateTime(entry.startTime)}
                  </td>
                  <td className="p-3 text-right font-semibold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                    {formatDuration(entry.duration)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={async () => {
                          setSelectedIds(new Set([entry.id]))
                          try {
                            await api.patch('/time-entries/approve', { ids: [entry.id] })
                            toast.success('Approvata', 'Registrazione approvata')
                            fetchPending()
                          } catch {
                            toast.error('Errore', 'Impossibile approvare')
                          } finally {
                            setSelectedIds(new Set())
                          }
                        }}
                        title="Approva"
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIds(new Set([entry.id]))
                          setRejectDialogOpen(true)
                        }}
                        title="Rifiuta"
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-gray-200/30 dark:border-white/5">
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Reject dialog with note */}
      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false)
          setRejectionNote('')
          setSelectedIds(new Set())
        }}
        onConfirm={handleReject}
        title="Rifiuta registrazioni"
        message={
          <div className="space-y-3">
            <p>
              Stai per rifiutare <strong>{selectedIds.size}</strong> registrazione
              {selectedIds.size !== 1 ? 'i' : 'e'}. Puoi aggiungere una nota (opzionale):
            </p>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Motivo del rifiuto (opzionale)..."
              rows={3}
              className="input w-full resize-none text-sm"
            />
          </div>
        }
        confirmLabel="Rifiuta"
        cancelLabel="Annulla"
        variant="danger"
        isLoading={isRejecting}
      />
    </div>
  )
}
