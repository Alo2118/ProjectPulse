/**
 * Team Time Page - View team-wide time entries (admin/direzione only)
 * @module pages/time-tracking/TeamTimePage
 */

import { useEffect, useState } from 'react'
import { useTeamTimeStore } from '@stores/teamTimeStore'
import { useProjectStore } from '@stores/projectStore'
import { useUserStore } from '@stores/userStore'
import { useAuthStore } from '@stores/authStore'
import { toast } from '@stores/toastStore'
import {
  Clock,
  Loader2,
  Users,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
} from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TimeEntry } from '@/types'

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
    month: 'short',
    year: 'numeric',
  })
}

export default function TeamTimePage() {
  const {
    byUser,
    byProject,
    entries,
    summary,
    filters,
    isLoading,
    fetchTeamTime,
    setFilters,
    clearFilters,
  } = useTeamTimeStore()

  const { projects, fetchProjects } = useProjectStore()
  const { users, fetchUsers } = useUserStore()
  const { token } = useAuthStore()

  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchUsers()
  }, [fetchProjects, fetchUsers])

  useEffect(() => {
    fetchTeamTime()
  }, [filters, fetchTeamTime])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters({ [key]: value || null })
  }

  const handleResetFilters = () => {
    clearFilters()
  }

  const getUserEntries = (userId: string): TimeEntry[] => {
    return entries.filter((e) => e.userId === userId)
  }

  const handleExportCSV = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate.split('T')[0])
      if (filters.endDate) params.append('endDate', filters.endDate.split('T')[0])
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.userId) params.append('userId', filters.userId)

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

  const maxUserMinutes = Math.max(...byUser.map((u) => u.totalMinutes), 1)

  if (isLoading && byUser.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tempo Team</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Panoramica delle ore registrate dal team
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="btn-secondary flex items-center self-start disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Data inizio
            </label>
            <input
              type="date"
              value={filters.startDate?.split('T')[0] || ''}
              onChange={(e) =>
                handleFilterChange('startDate', e.target.value ? `${e.target.value}T00:00:00Z` : '')
              }
              className="input w-auto"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Data fine
            </label>
            <input
              type="date"
              value={filters.endDate?.split('T')[0] || ''}
              onChange={(e) =>
                handleFilterChange('endDate', e.target.value ? `${e.target.value}T23:59:59Z` : '')
              }
              className="input w-auto"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Progetto
            </label>
            <select
              value={filters.projectId || ''}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
              className="input w-auto"
            >
              <option value="">Tutti i progetti</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Utente
            </label>
            <select
              value={filters.userId || ''}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="input w-auto"
            >
              <option value="">Tutti gli utenti</option>
              {users
                .filter((u) => u.isActive)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={handleResetFilters}
            className="btn-secondary flex items-center"
            title="Reset filtri"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="card-hover p-4">
            <div className="flex items-center">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Ore Totali
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {summary.totalHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
          <div className="card-hover p-4">
            <div className="flex items-center">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Utenti Attivi
                </p>
                <AnimatedCounter
                  value={summary.userCount}
                  className="text-xl font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="card-hover p-4">
            <div className="flex items-center">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Progetti
                </p>
                <AnimatedCounter
                  value={summary.projectCount}
                  className="text-xl font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="card-hover p-4">
            <div className="flex items-center">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Registrazioni
                </p>
                <AnimatedCounter
                  value={summary.entryCount}
                  className="text-xl font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
          <div className="card-hover p-4">
            <div className="flex items-center">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Media/Utente
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {summary.userCount > 0
                    ? (summary.totalHours / summary.userCount).toFixed(1)
                    : 0}
                  h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By User */}
        <div className="lg:col-span-2 card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              Per Utente
            </h2>
          </div>
          <div className="p-4">
            {byUser.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-3xl block mb-2">{'\u{1F465}'}</span>
                Nessun dato disponibile
              </div>
            ) : (
              <div className="space-y-3">
                {byUser.map((user) => (
                  <div key={user.userId} className="bg-gray-50/50 dark:bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                      className="w-full p-3 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium text-sm">
                          {user.firstName.charAt(0)}
                          {user.lastName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-left">
                            {user.firstName} {user.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <ProgressBar
                              value={Math.round((user.totalMinutes / maxUserMinutes) * 100)}
                              size="sm"
                              color="blue"
                              className="flex-1 max-w-48"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {user.entryCount} reg.
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                          {formatDuration(user.totalMinutes)}
                        </span>
                        {expandedUser === user.userId ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded entries */}
                    {expandedUser === user.userId && (
                      <div className="border-t border-gray-200/30 dark:border-white/5 p-3 space-y-2 bg-gray-100/30 dark:bg-black/10">
                        {getUserEntries(user.userId).slice(0, 10).map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between text-sm p-2 bg-white dark:bg-white/5 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {entry.task?.title || 'Senza task'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.task?.project?.name} · {formatDate(entry.startTime)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-2 tabular-nums">
                              {formatDuration(entry.duration)}
                            </span>
                          </div>
                        ))}
                        {getUserEntries(user.userId).length > 10 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                            +{getUserEntries(user.userId).length - 10} altre registrazioni
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* By Project */}
        <div className="card">
          <div className="p-4 border-b border-gray-200/30 dark:border-white/5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-purple-500" />
              Per Progetto
            </h2>
          </div>
          <div className="p-4">
            {byProject.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <span className="text-3xl block mb-2">{'\u{1F4C2}'}</span>
                Nessun dato disponibile
              </div>
            ) : (
              <div className="space-y-3">
                {byProject.map((project) => (
                  <div
                    key={project.projectId}
                    className="p-3 bg-gray-50/50 dark:bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {project.projectName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {project.projectCode}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-gray-900 dark:text-white ml-2 tabular-nums">
                        {formatDuration(project.totalMinutes)}
                      </span>
                    </div>
                    <ProgressBar
                      value={
                        summary
                          ? Math.round((project.totalMinutes / summary.totalMinutes) * 100)
                          : 0
                      }
                      size="sm"
                      color="green"
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
