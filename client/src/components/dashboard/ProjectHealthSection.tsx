/**
 * Project Health Section - Overview of all active projects health
 */

import { Link } from 'react-router-dom'
import { FolderKanban, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatusIcon } from '@/components/ui/StatusIcon'

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

function getHealthBorder(health: ProjectHealth['healthStatus']) {
  switch (health) {
    case 'healthy':
      return ''
    case 'at_risk':
      return 'border-l-2 border-l-amber-500'
    case 'critical':
      return 'border-l-2 border-l-red-500'
  }
}

function formatDaysRemaining(days: number | null): string {
  if (days === null) return 'No deadline'
  if (days < 0) return `${Math.abs(days)}g in ritardo`
  if (days === 0) return 'Scade oggi'
  if (days === 1) return 'Scade domani'
  return `${days}g rimanenti`
}

export function ProjectHealthSection({ projects, isLoading }: ProjectHealthSectionProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="p-4 border-b border-gray-200/30 dark:border-white/5">
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-white/5">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-20 mb-3" />
              <div className="skeleton h-2 w-full mb-2" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="card">
        <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary-500" />
            Salute Progetti
          </h2>
        </div>
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <span className="text-3xl block mb-2">{'\u{1F4C2}'}</span>
          Nessun progetto attivo
        </div>
      </div>
    )
  }

  // Sort: critical first, then at_risk, then healthy
  const sortedProjects = [...projects].sort((a, b) => {
    const order = { critical: 0, at_risk: 1, healthy: 2 }
    return order[a.healthStatus] - order[b.healthStatus]
  })

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200/30 dark:border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-primary-500" />
          Salute Progetti
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({projects.length} attivi)
          </span>
        </h2>
        <Link
          to="/projects"
          className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 flex items-center group"
        >
          Vedi tutti
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedProjects.slice(0, 8).map((project) => (
          <Link
            key={project.projectId}
            to={`/projects/${project.projectId}`}
            className={`p-4 rounded-lg bg-gray-50/50 dark:bg-white/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${getHealthBorder(
              project.healthStatus
            )}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {project.projectName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {project.projectCode}
                </p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${getHealthColor(project.healthStatus)}`} />
            </div>

            <div className="mb-3">
              <ProgressBar
                value={project.progress}
                size="sm"
                color={project.healthStatus === 'critical' ? 'red' : project.healthStatus === 'at_risk' ? 'amber' : 'auto'}
                showLabel
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <StatusIcon type="projectStatus" value={project.status} size="sm" />
                {project.openRisks > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {project.openRisks}
                  </span>
                )}
                {project.tasksBlocked > 0 && (
                  <span className="text-red-500 font-medium">
                    {project.tasksBlocked} bloccati
                  </span>
                )}
              </div>
              {project.targetEndDate && (
                <span
                  className={`flex items-center gap-1 ${
                    project.daysRemaining !== null && project.daysRemaining < 0
                      ? 'text-red-500 font-medium'
                      : project.daysRemaining !== null && project.daysRemaining < 7
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDaysRemaining(project.daysRemaining)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
