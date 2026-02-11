/**
 * Weekly Report Page - View and generate weekly reports
 * @module pages/reports/WeeklyReportPage
 */

import { useEffect, useState } from 'react'
import { useWeeklyReportStore } from '@stores/weeklyReportStore'
import { useAuthStore } from '@stores/authStore'
import { useToastStore } from '@stores/toastStore'
import {
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  Download,
  RefreshCw,
  Users,
  Calendar,
  TrendingUp,
  ArrowRight,
  FolderTree,
} from 'lucide-react'
import type { WeeklyReportData, WeeklyReport } from '@/types'
import { TaskTreeView } from '@components/reports/TaskTreeView'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

// Preview Section Component
function ReportPreview({ data }: { data: WeeklyReportData }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Ore Lavorate"
          value={data.timeTracking.totalHours.toFixed(1)}
          icon={Clock}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          label="Task Completati"
          value={data.tasks.completed.length}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          label="Task Bloccati"
          value={data.blockedTasks.length}
          icon={AlertTriangle}
          color={data.blockedTasks.length > 0
            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }
        />
        <StatCard
          label="Commenti"
          value={data.comments.total}
          icon={MessageSquare}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Time by Project */}
      {data.timeTracking.byProject.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Ore per Progetto
          </h3>
          <div className="space-y-3">
            {data.timeTracking.byProject.map((project) => {
              const hours = project.totalMinutes / 60
              const maxHours = Math.max(...data.timeTracking.byProject.map(p => p.totalMinutes / 60), 1)
              const pct = (hours / maxHours) * 100
              return (
                <div key={project.projectId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                      {project.projectCode} - {project.projectName}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time by User (team mode only) */}
      {data.timeTracking.byUser && data.timeTracking.byUser.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Ore per Dipendente
          </h3>
          <div className="space-y-3">
            {data.timeTracking.byUser.map((u) => {
              const hours = u.totalMinutes / 60
              const maxHours = Math.max(...data.timeTracking.byUser!.map(x => x.totalMinutes / 60), 1)
              const pct = (hours / maxHours) * 100
              return (
                <div key={u.userId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                      {u.userName}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-purple-500 transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time by Day */}
      {data.timeTracking.byDay.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Ore per Giorno
          </h3>
          <div className="flex items-end gap-2 h-32">
            {data.timeTracking.byDay.map((day) => {
              const maxMinutes = Math.max(...data.timeTracking.byDay.map(d => d.totalMinutes), 1)
              const pct = (day.totalMinutes / maxMinutes) * 100
              const hours = day.totalMinutes / 60
              const barHeight = Math.max(pct, 5)
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${formatDate(day.date)}: ${hours.toFixed(1)}h`}>
                  <span className="text-xs text-gray-500">{hours.toFixed(1)}h</span>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t h-20 flex flex-col justify-end">
                    <div
                      className="w-full bg-green-500 rounded-t transition-all"
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDate(day.date)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            Attività Task
          </h3>
          <div className="space-y-4">
            {/* Completed */}
            <div>
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                Completati ({data.tasks.completed.length})
              </h4>
              {data.tasks.completed.length > 0 ? (
                <ul className="space-y-1">
                  {data.tasks.completed.slice(0, 5).map((task) => (
                    <li key={task.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="truncate">
                        {task.code} - {task.title}
                        {task.assigneeName && (
                          <span className="text-xs text-primary-500 dark:text-primary-400 ml-1">— {task.assigneeName}</span>
                        )}
                      </span>
                    </li>
                  ))}
                  {data.tasks.completed.length > 5 && (
                    <li className="text-sm text-gray-400">...e altri {data.tasks.completed.length - 5}</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Nessun task completato questa settimana</p>
              )}
            </div>

            {/* In Progress */}
            <div>
              <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                In Corso ({data.tasks.inProgress.length})
              </h4>
              {data.tasks.inProgress.length > 0 ? (
                <ul className="space-y-1">
                  {data.tasks.inProgress.slice(0, 5).map((task) => (
                    <li key={task.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">
                        {task.code} - {task.title}
                        {task.assigneeName && (
                          <span className="text-xs text-primary-500 dark:text-primary-400 ml-1">— {task.assigneeName}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Nessun task in corso</p>
              )}
            </div>

            {/* Created */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Creati ({data.tasks.created.length})
              </h4>
              {data.tasks.created.length > 0 ? (
                <ul className="space-y-1">
                  {data.tasks.created.slice(0, 3).map((task) => (
                    <li key={task.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {task.code} - {task.title}
                        {task.assigneeName && (
                          <span className="text-xs text-primary-500 dark:text-primary-400 ml-1">— {task.assigneeName}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Nessun task creato questa settimana</p>
              )}
            </div>
          </div>
        </div>

        {/* Blocked Tasks */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Task Bloccati
          </h3>
          {data.blockedTasks.length > 0 ? (
            <div className="space-y-3">
              {data.blockedTasks.map((task) => (
                <div key={task.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {task.code} - {task.title}
                    {task.assigneeName && (
                      <span className="text-xs font-normal text-primary-500 dark:text-primary-400 ml-2">— {task.assigneeName}</span>
                    )}
                  </p>
                  {task.projectName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Progetto: {task.projectName}
                    </p>
                  )}
                  {task.lastComment && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                      "{task.lastComment.substring(0, 100)}{task.lastComment.length > 100 ? '...' : ''}"
                    </p>
                  )}
                  {task.blockedSince && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Bloccato dal {formatDate(task.blockedSince)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckCircle className="w-12 h-12 mb-2" />
              <p className="text-sm">Nessun task bloccato!</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments Summary */}
      {data.comments.byProject.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            Commenti per Progetto
          </h3>
          <div className="space-y-4">
            {data.comments.byProject.map((project) => (
              <div key={project.projectId}>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {project.projectCode} - {project.projectName} ({project.commentCount} commenti)
                </h4>
                <ul className="space-y-2 ml-4">
                  {project.comments.slice(0, 3).map((comment) => (
                    <li key={comment.id} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-xs text-gray-400">[{comment.taskCode}]</span>{' '}
                      {comment.content.substring(0, 80)}{comment.content.length > 80 ? '...' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Report History Component
function ReportHistory({
  reports,
  pagination,
  onPageChange,
  onSelect,
}: {
  reports: WeeklyReport[]
  pagination: { page: number; pages: number } | null
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
}) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nessun report generato</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="card p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          onClick={() => onSelect(report.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{report.code}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Settimana {report.weekNumber}/{report.year}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                report.status === 'completed'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {report.status === 'completed' ? 'Completato' : report.status}
              </span>
              {report.generatedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Generato il {new Date(report.generatedAt).toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                page === pagination.page
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeeklyReportPage() {
  const {
    currentWeekPreview,
    currentWeekInfo,
    reports,
    teamReports,
    selectedReport,
    isLoading,
    isGenerating,
    isLoadingPreview,
    error,
    pagination,
    teamPagination,
    fetchCurrentWeekInfo,
    fetchWeeklyPreview,
    fetchMyReports,
    fetchTeamReports,
    fetchReportById,
    generateReport,
    clearSelectedReport,
    clearError,
  } = useWeeklyReportStore()

  const { user } = useAuthStore()
  const { addToast } = useToastStore()
  const isDirezione = user?.role === 'direzione'
  const [activeTab, setActiveTab] = useState<'preview' | 'projectTree' | 'myReports' | 'teamReports'>('preview')

  useEffect(() => {
    fetchCurrentWeekInfo()
    fetchWeeklyPreview(isDirezione)
    fetchMyReports()
    fetchTeamReports()
  }, [fetchCurrentWeekInfo, fetchWeeklyPreview, fetchMyReports, fetchTeamReports, isDirezione])

  const handleGenerate = async () => {
    try {
      const report = await generateReport()
      addToast({
        type: 'success',
        title: 'Report Generato',
        message: `Report ${report.code} generato con successo!`,
      })
    } catch {
      addToast({
        type: 'error',
        title: 'Errore',
        message: 'Errore nella generazione del report',
      })
    }
  }

  const handleSelectReport = (id: string) => {
    fetchReportById(id)
  }

  // Show selected report detail
  if (selectedReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={clearSelectedReport}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 mb-2"
            >
              ← Torna alla lista
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedReport.code}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Settimana {selectedReport.weekNumber}/{selectedReport.year}
              {selectedReport.user && ` - ${selectedReport.user.firstName} ${selectedReport.user.lastName}`}
            </p>
          </div>
        </div>

        {selectedReport.reportData && (
          <ReportPreview data={selectedReport.reportData} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Settimanale</h1>
          {currentWeekInfo && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Settimana {currentWeekInfo.weekNumber}/{currentWeekInfo.year} ({formatDate(currentWeekInfo.weekStartDate)} - {formatDate(currentWeekInfo.weekEndDate)})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchWeeklyPreview(isDirezione)}
            disabled={isLoadingPreview}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Genera Report
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-500 underline mt-1">
            Chiudi
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Preview Settimana
        </button>
        <button
          onClick={() => setActiveTab('projectTree')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'projectTree'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Vista Progetti
        </button>
        <button
          onClick={() => setActiveTab('myReports')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'myReports'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          I Miei Report
        </button>
        <button
          onClick={() => setActiveTab('teamReports')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'teamReports'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Report Team
        </button>
      </div>

      {/* Content */}
      {activeTab === 'preview' && (
        isLoadingPreview && !currentWeekPreview ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : currentWeekPreview ? (
          <ReportPreview data={currentWeekPreview} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nessun dato disponibile per questa settimana</p>
          </div>
        )
      )}

      {activeTab === 'projectTree' && <TaskTreeView myTasksOnly={!isDirezione} />}

      {activeTab === 'myReports' && (
        isLoading && reports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <ReportHistory
            reports={reports}
            pagination={pagination}
            onPageChange={fetchMyReports}
            onSelect={handleSelectReport}
          />
        )
      )}

      {activeTab === 'teamReports' && (
        isLoading && teamReports.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <ReportHistory
            reports={teamReports}
            pagination={teamPagination}
            onPageChange={fetchTeamReports}
            onSelect={handleSelectReport}
          />
        )
      )}
    </div>
  )
}
