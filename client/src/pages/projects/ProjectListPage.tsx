/**
 * Project List Page - Table layout with progress and health indicators
 * @module pages/projects/ProjectListPage
 */

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { Plus, Search, FolderKanban, Calendar, ChevronUp, ChevronDown } from 'lucide-react'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@components/common/EmptyState'
import { formatDate } from '@utils/dateFormatters'

type SortKey = 'name' | 'status' | 'progress' | 'targetEndDate'
type SortDir = 'asc' | 'desc'

/** Returns a health badge class based on task stats and deadline */
function healthClass(hasBlocked: boolean, isOverdue: boolean, pct: number): string {
  if (hasBlocked || isOverdue) return 'text-red-600 dark:text-red-400 bg-red-500/10'
  if (pct < 33) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
  return 'text-green-600 dark:text-green-400 bg-green-500/10'
}

function healthLabel(hasBlocked: boolean, isOverdue: boolean, pct: number): string {
  if (hasBlocked) return 'Bloccato'
  if (isOverdue) return 'In ritardo'
  if (pct >= 100) return 'Completo'
  if (pct >= 66) return 'In linea'
  return 'In corso'
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { projects, isLoading, fetchProjects } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filteredProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      const matchesSearch =
        searchTerm === '' ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === '' || project.status === statusFilter
      const matchesPriority = priorityFilter === '' || project.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })

    return [...filtered].sort((a, b) => {
      let comparison = 0
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortKey === 'status') {
        comparison = a.status.localeCompare(b.status)
      } else if (sortKey === 'progress') {
        const pctA = a.taskStats && a.taskStats.total > 0
          ? (a.taskStats.completed / a.taskStats.total) * 100 : 0
        const pctB = b.taskStats && b.taskStats.total > 0
          ? (b.taskStats.completed / b.taskStats.total) * 100 : 0
        comparison = pctA - pctB
      } else if (sortKey === 'targetEndDate') {
        const dateA = a.targetEndDate ? new Date(a.targetEndDate).getTime() : Infinity
        const dateB = b.targetEndDate ? new Date(b.targetEndDate).getTime() : Infinity
        comparison = dateA - dateB
      }
      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [projects, searchTerm, statusFilter, priorityFilter, sortKey, sortDir])

  const canCreateProject = !!user

  // --- Skeleton ---
  if (isLoading && projects.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-4 w-64 mt-2" />
          </div>
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="skeleton h-10 flex-1 min-w-64" />
          <div className="skeleton h-10 w-40" />
          <div className="skeleton h-10 w-40" />
        </div>
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3 gap-4">
                <div className="skeleton h-5 flex-1" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-3 w-40 rounded-full" />
                <div className="skeleton h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Column header helper
  const SortHeader = ({ label, colKey }: { label: string; colKey: SortKey }) => {
    const active = sortKey === colKey
    return (
      <button
        type="button"
        onClick={() => handleSort(colKey)}
        className="flex items-center gap-1 text-xs uppercase tracking-widest text-slate-400 font-medium text-left hover:text-slate-300 transition-colors"
      >
        {label}
        {active ? (
          sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3" aria-hidden="true" />
            : <ChevronDown className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Progetti</h1>
          <p className="page-subtitle mt-1">
            Gestisci i tuoi progetti e monitora l&apos;avanzamento
          </p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => navigate('/projects/new')}
            className="btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Progetto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-52">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Cerca progetti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
                aria-label="Cerca progetti"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per stato"
          >
            <option value="">Tutti gli stati</option>
            <option value="planning">Pianificazione</option>
            <option value="design">Design</option>
            <option value="verification">Verifica</option>
            <option value="validation">Validazione</option>
            <option value="transfer">Trasferimento</option>
            <option value="maintenance">Manutenzione</option>
            <option value="on_hold">In Pausa</option>
            <option value="completed">Completato</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
            aria-label="Filtra per priorita"
          >
            <option value="">Tutte le priorita</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Bassa</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FolderKanban}
            title={searchTerm || statusFilter || priorityFilter ? 'Nessun progetto trovato' : 'Nessun progetto'}
            description={searchTerm || statusFilter || priorityFilter ? 'Prova a modificare i filtri' : 'Lancia il primo progetto!'}
            action={
              canCreateProject && !searchTerm && !statusFilter && !priorityFilter
                ? { label: 'Crea Progetto', onClick: () => navigate('/projects/new') }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header */}
          <div className="px-4 py-2.5 border-b border-cyan-500/5 grid grid-cols-[1fr_auto_180px_120px] gap-4 items-center">
            <SortHeader label="Progetto" colKey="name" />
            <SortHeader label="Stato" colKey="status" />
            <SortHeader label="Progresso" colKey="progress" />
            <SortHeader label="Scadenza" colKey="targetEndDate" />
          </div>

          {/* Table rows */}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filteredProjects.map((project, idx) => {
              const pct = project.taskStats && project.taskStats.total > 0
                ? Math.round((project.taskStats.completed / project.taskStats.total) * 100)
                : 0
              const hasBlocked = (project.taskStats?.blocked ?? 0) > 0
              const isOverdue =
                !!project.targetEndDate &&
                new Date(project.targetEndDate) < new Date() &&
                project.status !== 'completed'

              const hClass = project.taskStats && project.taskStats.total > 0
                ? healthClass(hasBlocked, isOverdue, pct)
                : ''
              const hLabel = project.taskStats && project.taskStats.total > 0
                ? healthLabel(hasBlocked, isOverdue, pct)
                : ''

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="grid grid-cols-[1fr_auto_180px_120px] gap-4 items-center px-4 py-3 border-t border-cyan-500/5 hover:bg-cyan-500/5 cursor-pointer transition-colors group"
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/projects/${project.id}`)
                    }
                  }}
                  aria-label={`Vai al progetto ${project.name}`}
                >
                  {/* Name + optional health dot */}
                  <div className="flex items-center gap-3 min-w-0">
                    {project.taskStats && project.taskStats.total > 0 && (
                      <span
                        className={`flex-shrink-0 w-2 h-2 rounded-full ${
                          hasBlocked || isOverdue
                            ? 'bg-red-500 animate-pulse'
                            : pct >= 66
                              ? 'bg-green-500'
                              : 'bg-amber-500'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate block group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {project.name}
                      </span>
                      {project.owner && (
                        <span className="text-xs text-slate-400">
                          {project.owner.firstName} {project.owner.lastName?.charAt(0)}.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <StatusIcon type="projectStatus" value={project.status} size="sm" showLabel />
                    {hLabel && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${hClass}`}>
                        {hLabel}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="w-full">
                    {project.taskStats && project.taskStats.total > 0 ? (
                      <div className="space-y-0.5">
                        <ProgressBar value={pct} size="sm" glow />
                        <span className="text-[10px] text-slate-400">
                          {project.taskStats.completed}/{project.taskStats.total} task
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Nessun task</span>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="flex items-center gap-1 text-xs">
                    {project.targetEndDate ? (
                      <>
                        <Calendar
                          className={`w-3 h-3 flex-shrink-0 ${
                            isOverdue
                              ? 'text-red-500'
                              : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={
                            isOverdue
                              ? 'text-red-500 dark:text-red-400 font-medium'
                              : 'text-slate-400'
                          }
                        >
                          {formatDate(project.targetEndDate)}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Footer count */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 text-xs text-slate-400">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'progetto' : 'progetti'}
          </div>
        </div>
      )}
    </div>
  )
}
