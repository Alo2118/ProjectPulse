import { useState, useEffect } from 'react';
import {
  Clock,
  TrendingUp,
  Target,
  Filter,
  Download,
  CheckCircle2,
  Briefcase,
  Activity,
  Award,
  Users,
  ChevronRight,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { reportsApi } from '../services/api';
import { formatTime } from '../utils/helpers';
import {
  getStatusConfig,
  calculateProjectProgress,
  getProjectHealthColor,
} from '../utils/statusConfig';
import { designTokens } from '../config/designTokens';
import { GamingLayout, GamingCard, GamingLoader, Button } from '../components/ui';
import { useTheme } from '../hooks/useTheme';
import { GamingKPICard, GamingKPIGrid } from '../components/ui';

export default function ReportsPage() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    userId: '',
    projectId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.userId) params.user_id = filters.userId;
      if (filters.projectId) params.project_id = filters.projectId;

      const response = await reportsApi.getWeekly(params);
      setReportData(response.data);
    } catch (error) {
      console.error('Errore nel caricamento del report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <GamingLoader message="Caricamento Mission Control..." />;
  }

  if (!reportData) return null;

  const totalHours = (reportData.totalPeriodSeconds || 0) / 3600;
  const totalTasks = reportData.taskTree?.length || 0;
  const completedTasks = reportData.taskTree?.filter((t) => t.status === 'completed').length || 0;
  const activeProjects =
    reportData.projects?.filter((p) => p.tasks?.some((t) => t.status === 'in_progress')).length ||
    0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <GamingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`mb-1 flex items-center gap-2 text-3xl font-bold ${designTokens.colors.cyan.text}`}>
              <Activity className={`h-8 w-8 ${designTokens.colors.cyan.textLight}`} />
              Mission Control
            </h1>
            <p className={`text-base font-medium ${colors.text.tertiary}`}>
              Monitor progetti e performance in tempo reale
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'primary' : 'secondary'}
            >
              <Filter className="h-4 w-4" />
              Filtri
            </Button>
            <Button variant="primary">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filtri */}
        {showFilters && (
          <GamingCard className="animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="text-label mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-label mb-1">Data Fine</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-label mb-1">Utente</label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  placeholder="ID Utente"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-label mb-1">Progetto</label>
                <input
                  type="text"
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  placeholder="ID Progetto"
                  className="input-dark w-full"
                />
              </div>
            </div>
          </GamingCard>
        )}

        {/* KPI Cards */}
        <GamingKPIGrid>
          <GamingKPICard
            icon={Clock}
            title="Ore Totali"
            value={`${totalHours.toFixed(1)}h`}
            color="cyan"
            subtitle="+12% vs settimana scorsa"
            subtitleIcon={TrendingUp}
          />
          <GamingKPICard
            icon={CheckCircle2}
            title="Task Completati"
            value={`${completedTasks}/${totalTasks}`}
            color="emerald"
            subtitle={`${completionRate}% completamento`}
            subtitleIcon={Award}
          />
          <GamingKPICard
            icon={Briefcase}
            title="Progetti Attivi"
            value={activeProjects}
            color="purple"
            subtitle="In lavorazione"
            subtitleIcon={Zap}
          />
          <GamingKPICard
            icon={Target}
            title="Efficienza"
            value={`${completionRate}%`}
            color="orange"
            subtitle="Performance ottima"
            subtitleIcon={TrendingUp}
          />
        </GamingKPIGrid>

        {/* Projects Section */}
        <div className="space-y-4">
          <h2 className="card-header flex items-center gap-2">
            <Briefcase className={`h-6 w-6 ${designTokens.colors.cyan.textLight}`} />
            Progetti
            <span className={`text-sm font-semibold ${colors.text.light}`}>
              ({reportData.projects?.length || 0})
            </span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {reportData.projects?.map((project) => {
              const progress = calculateProjectProgress(project);
              const hoursWorked = (project.period_seconds || 0) / 3600;
              const hoursEstimated = project.estimated_hours || 0;
              const healthColor = getProjectHealthColor(progress, hoursWorked, hoursEstimated);
              const isOverBudget = hoursEstimated > 0 && hoursWorked > hoursEstimated;

              return (
                <GamingCard
                  key={project.id}
                  className="group relative cursor-pointer overflow-hidden"
                >
                  {/* Progress Background */}
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-700/20 to-blue-600/10 transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>

                  <div className="relative z-10 p-4">
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className={`text-lg font-bold ${colors.text.primary}`}>{project.name}</h3>
                          {progress === 100 && (
                            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-green-700 px-2 py-0.5 text-xs font-bold text-white shadow-lg">
                              <Award className="mr-1 inline h-3 w-3" />
                              COMPLETATO
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className={`text-sm ${colors.text.secondary}`}>{project.description}</p>
                        )}
                      </div>

                      {/* Health Indicator */}
                      <div className={`flex items-center gap-2 rounded-full border ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary} px-3 py-1.5`}>
                        <div className={`h-2.5 w-2.5 rounded-full ${designTokens.colors.cyan.solid} shadow-md`}></div>
                        <span className={`text-sm font-bold ${designTokens.colors.cyan.textBright}`}>{progress}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className={`h-2.5 overflow-hidden rounded-full border ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary} shadow-inner`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-cyan-500/40 transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-3 grid grid-cols-3 gap-3">
                      <div className={`rounded-lg border ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary} p-2 text-center`}>
                        <Clock className={`mx-auto mb-1 h-4 w-4 ${designTokens.colors.cyan.textLight}`} />
                        <p className={`mb-0.5 text-xs font-semibold ${colors.text.secondary}`}>Ore Lavorate</p>
                        <p
                          className={`text-lg font-bold ${isOverBudget ? designTokens.colors.error.text : colors.text.primary}`}
                        >
                          {hoursWorked.toFixed(1)}h
                        </p>
                        {hoursEstimated > 0 && (
                          <p className={`text-xs font-medium ${colors.text.tertiary}`}>
                            / {hoursEstimated}h stimate
                          </p>
                        )}
                      </div>

                      <div className={`rounded-lg border ${designTokens.colors.success.border} ${colors.bg.secondary} p-2 text-center`}>
                        <Target className={`mx-auto mb-1 h-4 w-4 ${designTokens.colors.success.text}`} />
                        <p className={`mb-0.5 text-xs font-semibold ${colors.text.secondary}`}>Task</p>
                        <p className={`text-lg font-bold ${colors.text.primary}`}>
                          {project.tasks?.filter((t) => t.status === 'completed').length || 0}
                          <span className={colors.text.tertiary}>/{project.tasks?.length || 0}</span>
                        </p>
                      </div>

                      <div className={`rounded-lg border border-purple-500/30 ${colors.bg.secondary} p-2 text-center`}>
                        <Users className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                        <p className={`mb-0.5 text-xs font-semibold ${colors.text.secondary}`}>Team</p>
                        <p className={`text-lg font-bold ${colors.text.primary}`}>
                          {new Set(project.tasks?.map((t) => t.assigned_to)).size || 0}
                        </p>
                      </div>
                    </div>

                    {/* Tasks Preview */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className={`text-sm font-semibold ${colors.text.primary}`}>Task Recenti</span>
                          <ChevronRight className={`h-4 w-4 ${colors.text.tertiary} transition-colors group-hover:text-cyan-600 dark:group-hover:text-cyan-400`} />
                        </div>
                        <div className="space-y-1">
                          {project.tasks.slice(0, 3).map((task) => {
                            const statusConfig = getStatusConfig(task.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                              <div
                                key={task.id}
                                className={`flex items-center gap-2 rounded-lg border ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary} p-2 transition-all ${colors.bg.hover}`}
                              >
                                <StatusIcon
                                  className={`h-3.5 w-3.5 text-${statusConfig.color}-400 flex-shrink-0`}
                                />
                                <span className={`flex-1 truncate text-sm font-medium ${colors.text.primary}`}>
                                  {task.title}
                                </span>
                                {task.period_seconds > 0 && (
                                  <span className={`text-xs font-bold ${designTokens.colors.cyan.text}`}>
                                    {formatTime(task.period_seconds)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </GamingCard>
              );
            })}

            {/* Tasks without project */}
            {reportData.taskTree?.filter((t) => !t.project_name).length > 0 && (
              <GamingCard className={`relative overflow-hidden border ${designTokens.colors.warning.border} ${colors.bg.secondary} hover:border-orange-300 dark:hover:border-orange-500/20`}>
                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${designTokens.colors.warning.textLight}`} />
                    <h3 className={`text-lg font-bold ${colors.text.primary}`}>Task Senza Progetto</h3>
                    <span className={`rounded-full border ${designTokens.colors.warning.borderLight} ${designTokens.colors.warning.bg} px-2 py-0.5 text-xs font-bold ${designTokens.colors.warning.text}`}>
                      {reportData.taskTree.filter((t) => !t.project_name).length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {reportData.taskTree
                      .filter((t) => !t.project_name)
                      .slice(0, 5)
                      .map((task) => {
                        const statusConfig = getStatusConfig(task.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-2 rounded-lg border ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary} p-2 transition-all ${colors.bg.hover}`}
                          >
                            <StatusIcon className={`h-3.5 w-3.5 text-${statusConfig.color}-400`} />
                            <span className="flex-1 text-sm font-medium text-slate-200">
                              {task.title}
                            </span>
                            {task.period_seconds > 0 && (
                              <span className={`text-xs font-bold ${designTokens.colors.cyan.text}`}>
                                {formatTime(task.period_seconds)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </GamingCard>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        {reportData.taskTree && reportData.taskTree.length > 0 && (
          <div className="space-y-4">
            <h2 className="card-header flex items-center gap-2">
              <Activity className={`h-6 w-6 ${designTokens.colors.cyan.text}`} />
              Timeline Attività
            </h2>

            <GamingCard>
              <div className="space-y-3">
                {(() => {
                  // Group tasks by project
                  const tasksByProject = reportData.taskTree.reduce((acc, task) => {
                    const projectKey = task.project_name || 'Senza Progetto';
                    if (!acc[projectKey]) {
                      acc[projectKey] = [];
                    }
                    acc[projectKey].push(task);
                    return acc;
                  }, {});

                  const renderTask = (task, level = 0, index = 0, showProject = false) => {
                    const statusConfig = getStatusConfig(task.status);
                    const StatusIcon = statusConfig.icon;
                    const allTasks = tasksByProject[task.project_name || 'Senza Progetto'];
                    const subtasks = allTasks.filter((t) => t.parent_task_id === task.id);
                    const hasSubtasks = subtasks.length > 0;
                    const isSubtask = level > 0;

                    return (
                      <div key={task.id}>
                        <div
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border ${designTokens.colors.cyan.borderLight} ${colors.bg.tertiary} p-2.5 transition-all hover:${colors.bg.hover} ${isSubtask ? 'ml-8' : ''}`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Indent indicator for subtasks */}
                          {isSubtask && (
                            <div className="flex flex-shrink-0 items-center">
                              <div className="flex h-6 w-6 items-center justify-center">
                                <div className={`h-px w-4 ${designTokens.colors.cyan.bg}`}></div>
                                <ChevronRight className={`-ml-1 h-3 w-3 ${designTokens.colors.cyan.text}`} />
                              </div>
                            </div>
                          )}

                          {/* Status Icon */}
                          <div
                            className={`flex-shrink-0 ${isSubtask ? 'h-6 w-6' : 'h-8 w-8'} rounded-full bg-gradient-to-br ${statusConfig.gradient} flex items-center justify-center shadow-md`}
                          >
                            <StatusIcon
                              className={`${isSubtask ? 'h-3 w-3' : 'h-4 w-4'} text-white`}
                            />
                          </div>

                          {/* Task Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4
                                className={`truncate font-semibold text-slate-100 ${isSubtask ? 'text-xs' : 'text-sm'}`}
                              >
                                {task.title}
                              </h4>
                              {task.assigned_to_name && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <span>•</span>
                                  <Users className="h-3 w-3" />
                                  <span className="font-medium">{task.assigned_to_name}</span>
                                </span>
                              )}
                              {hasSubtasks && (
                                <span className={`rounded-full border ${designTokens.colors.cyan.borderLight} ${designTokens.colors.cyan.bg} px-2 py-0.5 text-xs font-bold ${designTokens.colors.cyan.textLight}`}>
                                  {subtasks.length} sub
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          {task.period_seconds > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <div
                                className={`font-bold ${designTokens.colors.cyan.text} ${isSubtask ? 'text-sm' : 'text-base'}`}
                              >
                                {formatTime(task.period_seconds)}
                              </div>
                              <div className="text-xs font-medium text-slate-400">ore</div>
                            </div>
                          )}
                        </div>

                        {/* Render subtasks */}
                        {subtasks.length > 0 && (
                          <div className="mt-1.5 space-y-1.5">
                            {subtasks.map((subtask, subIndex) =>
                              renderTask(subtask, level + 1, subIndex, false)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  };

                  // Render grouped by project
                  return Object.entries(tasksByProject).map(([projectName, tasks], projIndex) => {
                    const parentTasks = tasks.filter((t) => !t.parent_task_id);
                    const totalTime = tasks.reduce((sum, t) => sum + (t.period_seconds || 0), 0);

                    return (
                      <div key={projectName} className="space-y-2">
                        {/* Project Header */}
                        <div className={`flex items-center justify-between rounded-lg border-l-4 ${designTokens.colors.cyan.border} ${colors.bg.tertiary} px-3 py-2 shadow-sm`}>
                          <div className="flex items-center gap-2">
                            <Briefcase className={`h-5 w-5 ${designTokens.colors.cyan.text}`} />
                            <h3 className={`text-sm font-bold ${colors.text.primary}`}>{projectName}</h3>
                            <span className={`rounded-full border ${designTokens.colors.cyan.borderLight} ${colors.bg.primary} px-2 py-0.5 text-xs font-semibold ${designTokens.colors.cyan.textLight}`}>
                              {tasks.length} task
                            </span>
                          </div>
                          {totalTime > 0 && (
                            <div className={`flex items-center gap-1 ${designTokens.colors.cyan.text}`}>
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-bold">{formatTime(totalTime)}</span>
                            </div>
                          )}
                        </div>

                        {/* Tasks in this project */}
                        <div className="space-y-1.5">
                          {parentTasks.map((task, index) => renderTask(task, 0, index, false))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </GamingCard>
          </div>
        )}
      </div>
    </GamingLayout>
  );
}
