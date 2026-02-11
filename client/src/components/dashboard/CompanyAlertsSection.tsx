/**
 * Company Alerts Section - Critical situations requiring attention
 */

import { Link } from 'react-router-dom'
import { AlertTriangle, AlertOctagon, Calendar, FolderKanban, ArrowRight } from 'lucide-react'

interface ProjectHealth {
  projectId: string
  projectCode: string
  projectName: string
  status: string
  healthStatus: 'healthy' | 'at_risk' | 'critical'
  tasksBlocked: number
  highRisks: number
  daysRemaining: number | null
  progress: number
}

interface CompanyAlertsSectionProps {
  projects: ProjectHealth[]
  blockedTasksCount: number
  openRisksCount: number
  isLoading?: boolean
}

export function CompanyAlertsSection({
  projects,
  blockedTasksCount,
  openRisksCount,
  isLoading,
}: CompanyAlertsSectionProps) {
  if (isLoading) {
    return (
      <div className="card border-red-500/20 dark:border-red-500/30">
        <div className="p-4 border-b border-red-200/30 dark:border-red-500/10">
          <div className="skeleton h-6 w-48" />
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-white/5">
              <div className="skeleton h-5 w-32 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Calculate alerts
  const criticalProjects = projects.filter((p) => p.healthStatus === 'critical')
  const overdueProjects = projects.filter((p) => p.daysRemaining !== null && p.daysRemaining < 0 && p.status !== 'completed' && p.status !== 'cancelled')
  const projectsWithBlockedTasks = projects.filter((p) => p.tasksBlocked > 0)
  const projectsWithHighRisks = projects.filter((p) => p.highRisks > 0)

  const hasAlerts =
    blockedTasksCount > 0 ||
    openRisksCount > 0 ||
    criticalProjects.length > 0 ||
    overdueProjects.length > 0

  if (!hasAlerts) {
    return (
      <div className="card border-green-500/20 dark:border-green-500/30">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">{'\u2705'}</span>
          </div>
          <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
            Nessun alert critico
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tutti i progetti procedono regolarmente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-red-500/20 dark:border-red-500/30">
      <div className="p-4 border-b border-red-200/30 dark:border-red-500/10">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Attenzione Richiesta
        </h2>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Blocked Tasks */}
        {blockedTasksCount > 0 && (
          <div className="p-4 rounded-lg bg-red-500/5 dark:bg-red-500/10 border-l-2 border-l-red-500">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-600 dark:text-red-400">
                Task Bloccati
              </h3>
              <span className="ml-auto text-lg font-bold text-red-500">
                {blockedTasksCount}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {projectsWithBlockedTasks.length} progetti hanno task bloccati
            </p>
            <div className="space-y-1">
              {projectsWithBlockedTasks.slice(0, 3).map((project) => (
                <Link
                  key={project.projectId}
                  to={`/projects/${project.projectId}`}
                  className="block text-xs text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  {project.projectCode}: {project.tasksBlocked} bloccati
                </Link>
              ))}
            </div>
            <Link
              to="/tasks?status=blocked"
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 mt-2 group"
            >
              Vedi tutti i task bloccati
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* High Risks */}
        {projectsWithHighRisks.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-l-amber-500">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-amber-600 dark:text-amber-400">
                Rischi Critici
              </h3>
              <span className="ml-auto text-lg font-bold text-amber-500">
                {projectsWithHighRisks.reduce((sum, p) => sum + p.highRisks, 0)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {projectsWithHighRisks.length} progetti con rischi ad alto impatto
            </p>
            <div className="space-y-1">
              {projectsWithHighRisks.slice(0, 3).map((project) => (
                <Link
                  key={project.projectId}
                  to={`/projects/${project.projectId}`}
                  className="block text-xs text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  {project.projectCode}: {project.highRisks} rischi high
                </Link>
              ))}
            </div>
            <Link
              to="/risks"
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 mt-2 group"
            >
              Gestisci rischi
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Overdue Projects */}
        {overdueProjects.length > 0 && (
          <div className="p-4 rounded-lg bg-red-500/5 dark:bg-red-500/10 border-l-2 border-l-red-400">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-red-400" />
              <h3 className="font-semibold text-red-600 dark:text-red-400">
                Progetti in Ritardo
              </h3>
              <span className="ml-auto text-lg font-bold text-red-400">
                {overdueProjects.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Progetti oltre la data target
            </p>
            <div className="space-y-1">
              {overdueProjects.slice(0, 3).map((project) => (
                <Link
                  key={project.projectId}
                  to={`/projects/${project.projectId}`}
                  className="block text-xs text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  {project.projectCode}: {Math.abs(project.daysRemaining!)}g in ritardo
                </Link>
              ))}
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 mt-2 group"
            >
              Vedi tutti i progetti
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* Critical Projects Summary (if no specific alerts above) */}
        {criticalProjects.length > 0 &&
          blockedTasksCount === 0 &&
          projectsWithHighRisks.length === 0 &&
          overdueProjects.length === 0 && (
            <div className="p-4 rounded-lg bg-red-500/5 dark:bg-red-500/10 border-l-2 border-l-red-500">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-600 dark:text-red-400">
                  Progetti Critici
                </h3>
                <span className="ml-auto text-lg font-bold text-red-500">
                  {criticalProjects.length}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Richiedono attenzione immediata
              </p>
              <div className="space-y-1">
                {criticalProjects.slice(0, 3).map((project) => (
                  <Link
                    key={project.projectId}
                    to={`/projects/${project.projectId}`}
                    className="block text-xs text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                  >
                    {project.projectCode}: {project.projectName}
                  </Link>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
