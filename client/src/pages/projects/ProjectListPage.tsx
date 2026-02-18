/**
 * Project List Page - Shows all projects with filters
 * @module pages/projects/ProjectListPage
 */

import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@stores/projectStore'
import { useAuthStore } from '@stores/authStore'
import { Plus, Search, Calendar, Users } from 'lucide-react'
import { PROJECT_PRIORITY_BORDER_COLORS } from '@/constants'
import { StatusIcon } from '@/components/ui/StatusIcon'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Tooltip } from '@/components/ui/Tooltip'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { projects, isLoading, fetchProjects } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        searchTerm === '' ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === '' || project.status === statusFilter
      const matchesPriority = priorityFilter === '' || project.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [projects, searchTerm, statusFilter, priorityFilter])

  const canCreateProject = !!user

  if (isLoading && projects.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-32" />
            <div className="skeleton h-4 w-64 mt-2" />
          </div>
          <div className="skeleton h-10 w-40" />
        </div>

        {/* Filters skeleton */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-4">
            <div className="skeleton h-10 flex-1 min-w-64" />
            <div className="skeleton h-10 w-40" />
            <div className="skeleton h-10 w-40" />
          </div>
        </div>

        {/* Project grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-3 w-3 rounded-full" />
              </div>
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-16 w-full" />
              <div className="skeleton h-2 w-full" />
              <div className="flex justify-between">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Progetti</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Gestisci i tuoi progetti e monitora l'avanzamento
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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Cerca progetti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
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
          >
            <option value="">Tutte le priorita</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Bassa</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-5xl block mb-4">{searchTerm || statusFilter || priorityFilter ? '\u{1F50D}' : '\u{1F680}'}</span>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || statusFilter || priorityFilter
              ? 'Nessun progetto trovato'
              : 'Nessun progetto'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter || priorityFilter
              ? 'Prova a modificare i filtri di ricerca'
              : 'Lancia il primo progetto!'}
          </p>
          {canCreateProject && !searchTerm && !statusFilter && !priorityFilter && (
            <button onClick={() => navigate('/projects/new')} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Crea Progetto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className={`card-hover p-6 border-l-4 ${PROJECT_PRIORITY_BORDER_COLORS[project.priority]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon type="projectStatus" value={project.status} size="md" showLabel />
                    {project.taskStats && project.taskStats.total > 0 && (() => {
                      const pct = (project.taskStats.completed / project.taskStats.total) * 100
                      const hasBlocked = project.taskStats.blocked > 0
                      const isOverdue = project.targetEndDate && new Date(project.targetEndDate) < new Date() && project.status !== 'completed'
                      const healthColor = hasBlocked || isOverdue
                        ? 'bg-red-500 shadow-red-500/50 animate-pulse'
                        : pct < 33
                          ? 'bg-amber-500 shadow-amber-500/50'
                          : 'bg-green-500 shadow-green-500/50'
                      return <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-sm ${healthColor}`} title={hasBlocked ? 'Task bloccati' : isOverdue ? 'Scaduto' : `${Math.round(pct)}% completato`} />
                    })()}
                  </div>
                  <Tooltip
                    position="bottom"
                    content={
                      <div className="space-y-1.5 min-w-48">
                        <p className="font-semibold">{project.name}</p>
                        <div className="flex items-center gap-2 text-[11px] opacity-80">
                          <StatusIcon type="projectStatus" value={project.status} size="sm" showLabel />
                        </div>
                        {project.taskStats && (
                          <p className="text-[11px] opacity-70">
                            📋 {project.taskStats.completed}/{project.taskStats.total} task completati
                            {project.taskStats.blocked > 0 && ` · 🚫 ${project.taskStats.blocked} bloccati`}
                          </p>
                        )}
                        {project.owner && (
                          <p className="text-[11px] opacity-70">👤 {project.owner.firstName} {project.owner.lastName}</p>
                        )}
                        {project.targetEndDate && (
                          <p className="text-[11px] opacity-70">📅 {formatDate(project.targetEndDate)}</p>
                        )}
                      </div>
                    }
                  >
                    <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {project.name}
                    </h3>
                  </Tooltip>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{project.code}</p>
                </div>
              </div>
              {project.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {project.description}
                </p>
              )}

              {/* Counts */}
              {project._count && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <span>{'\u{1F4CB}'}</span>
                    <AnimatedCounter value={project._count.tasks || 0} className="font-semibold text-gray-900 dark:text-white" />
                    <span>task</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <span>{'\u26A0\uFE0F'}</span>
                    <AnimatedCounter value={project._count.risks || 0} className="font-semibold text-gray-900 dark:text-white" />
                    <span>rischi</span>
                  </div>
                </div>
              )}

              {/* Progress + Health */}
              {project.taskStats && project.taskStats.total > 0 && (
                <div className="mt-4 space-y-2">
                  <ProgressBar
                    value={Math.round((project.taskStats.completed / project.taskStats.total) * 100)}
                    size="sm"
                    showLabel
                    glow
                    animated
                  />
                  {project.taskStats.blocked > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 animate-pulse">
                      <span>🚫</span>
                      <span>{project.taskStats.blocked} task bloccati</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{formatDate(project.targetEndDate)}</span>
                </div>
                {project.owner && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="truncate max-w-24">
                      {project.owner.firstName} {project.owner.lastName?.charAt(0)}.
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
