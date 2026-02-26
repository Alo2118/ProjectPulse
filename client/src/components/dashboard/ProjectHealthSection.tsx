/**
 * Project Health Section - Sortable table of all active projects health
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, ArrowRight, ArrowUpDown, Calendar, AlertTriangle } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface ProjectHealth {
  projectId: string
  projectCode: string
  projectName: string
  status: string
  priority: string
  progress: number
  tasksTotal: number
  tasksCompleted: number
  tasksBlocked: number
  tasksInProgress: number
  openRisks: number
  highRisks: number
  targetEndDate: string | null
  daysRemaining: number | null
  healthStatus: 'healthy' | 'at_risk' | 'critical'
}

interface ProjectHealthSectionProps {
  projects: ProjectHealth[]
  isLoading?: boolean
}

type SortKey = 'name' | 'progress' | 'blocked' | 'risks' | 'deadline' | 'health'
type SortDir = 'asc' | 'desc'

function getHealthColor(health: ProjectHealth['healthStatus']) {
  switch (health) {
    case 'healthy':
      return 'bg-green-500'
    case 'at_risk':
      return 'bg-amber-500'
    case 'critical':
      return 'bg-red-500'
  }
}

function getDeadlineBadge(days: number | null): { label: string; className: string } {
  if (days === null) return { label: '-', className: 'text-slate-400 dark:text-slate-500' }
  if (days < 0) return { label: `${Math.abs(days)}g ritardo`, className: 'bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full' }
  if (days === 0) return { label: 'Oggi', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full' }
  if (days <= 7) return { label: `${days}g`, className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full' }
  if (days <= 30) return { label: `${days}g`, className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full' }
  return { label: `${days}g`, className: 'text-slate-500 dark:text-slate-400' }
}

export function ProjectHealthSection({ projects, isLoading }: ProjectHealthSectionProps) {
  const [sortKey, setSortKey] = useState<SortKey>('health')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedProjects = useMemo(() => {
    const healthOrder = { critical: 0, at_risk: 1, healthy: 2 }
    return [...projects].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = a.projectName.localeCompare(b.projectName)
          break
        case 'progress':
          cmp = a.progress - b.progress
          break
        case 'blocked':
          cmp = a.tasksBlocked - b.tasksBlocked
          break
        case 'risks':
          cmp = a.openRisks - b.openRisks
          break
        case 'deadline':
          cmp = (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999)
          break
        case 'health':
          cmp = healthOrder[a.healthStatus] - healthOrder[b.healthStatus]
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [projects, sortKey, sortDir])

  if (isLoading) {
    return (
      <div className="card">
        <div className="p-4 border-b border-slate-200/30 dark:border-white/5">
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-24 flex-1" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="card">
        <div className="p-4 border-b border-slate-200/30 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-cyan-500" />
            Salute Progetti
          </h2>
        </div>
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
          <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nessun progetto attivo</p>
        </div>
      </div>
    )
  }

  const SortHeader = ({ label, sortKeyVal, className = '' }: { label: string; sortKeyVal: SortKey; className?: string }) => (
    <button
      onClick={() => handleSort(sortKeyVal)}
      className={`flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide hover:text-slate-700 dark:hover:text-slate-300 transition-colors ${className}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === sortKeyVal ? 'text-cyan-500' : 'opacity-40'}`} />
    </button>
  )

  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200/30 dark:border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-cyan-500" />
          Salute Progetti
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            ({projects.length} attivi)
          </span>
        </h2>
        <Link
          to="/projects"
          className="text-sm text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 flex items-center group"
        >
          Vedi tutti
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Table header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
        <div className="col-span-3">
          <SortHeader label="Progetto" sortKeyVal="name" />
        </div>
        <div className="col-span-3">
          <SortHeader label="Progresso" sortKeyVal="progress" />
        </div>
        <div className="col-span-1 text-center">
          <SortHeader label="Blocc." sortKeyVal="blocked" className="justify-center" />
        </div>
        <div className="col-span-1 text-center">
          <SortHeader label="Rischi" sortKeyVal="risks" className="justify-center" />
        </div>
        <div className="col-span-2">
          <SortHeader label="Scadenza" sortKeyVal="deadline" />
        </div>
        <div className="col-span-2 text-right">
          <SortHeader label="Salute" sortKeyVal="health" className="justify-end" />
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {sortedProjects.map((project) => {
          const badge = getDeadlineBadge(project.daysRemaining)
          return (
            <Link
              key={project.projectId}
              to={`/projects/${project.projectId}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors items-center"
            >
              {/* Name */}
              <div className="md:col-span-3 flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getHealthColor(project.healthStatus)}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {project.projectName}
                </span>
              </div>

              {/* Progress */}
              <div className="md:col-span-3">
                <ProgressBar
                  value={project.progress}
                  size="sm"
                  color={project.healthStatus === 'critical' ? 'red' : project.healthStatus === 'at_risk' ? 'amber' : 'auto'}
                  showLabel
                />
              </div>

              {/* Blocked */}
              <div className="md:col-span-1 text-center">
                {project.tasksBlocked > 0 ? (
                  <span className="text-sm font-medium text-red-500">{project.tasksBlocked}</span>
                ) : (
                  <span className="text-sm text-slate-300 dark:text-slate-600">0</span>
                )}
              </div>

              {/* Risks */}
              <div className="md:col-span-1 text-center">
                {project.openRisks > 0 ? (
                  <span className="flex items-center justify-center gap-0.5 text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {project.openRisks}
                  </span>
                ) : (
                  <span className="text-sm text-slate-300 dark:text-slate-600">0</span>
                )}
              </div>

              {/* Deadline */}
              <div className="md:col-span-2 flex items-center gap-1">
                {project.targetEndDate && (
                  <>
                    <Calendar className="w-3 h-3 text-slate-400 hidden md:block" />
                    <span className={`text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </>
                )}
              </div>

              {/* Health */}
              <div className="md:col-span-2 text-right">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  project.healthStatus === 'critical'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : project.healthStatus === 'at_risk'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-green-500/10 text-green-600 dark:text-green-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${getHealthColor(project.healthStatus)}`} />
                  {project.healthStatus === 'critical' ? 'Critico' : project.healthStatus === 'at_risk' ? 'A rischio' : 'Sano'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
