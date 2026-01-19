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
import theme, { cn } from '../styles/theme';
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
      <div className={theme.spacing.section}>
        {/* Header */}
        <div className={theme.layout.flexBetween}>
          <div>
            <h1 className={cn(
              theme.text.display,
              theme.colors.cyan.text,
              'mb-1 flex items-center gap-2'
            )}>
              <Activity className={cn('h-8 w-8', theme.colors.cyan.textLight)} />
              Mission Control
            </h1>
            <p className={cn(theme.text.body, colors.text.tertiary)}>
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
                <label className={cn(theme.text.label, 'mb-1')}>Data Inizio</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className={cn(theme.input.base, theme.input.dark, 'w-full')}
                />
              </div>
              <div>
                <label className={cn(theme.text.label, 'mb-1')}>Data Fine</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className={cn(theme.input.base, theme.input.dark, 'w-full')}
                />
              </div>
              <div>
                <label className={cn(theme.text.label, 'mb-1')}>Utente</label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  placeholder="ID Utente"
                  className={cn(theme.input.base, theme.input.dark, 'w-full')}
                />
              </div>
              <div>
                <label className={cn(theme.text.label, 'mb-1')}>Progetto</label>
                <input
                  type="text"
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  placeholder="ID Progetto"
                  className={cn(theme.input.base, theme.input.dark, 'w-full')}
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
        <div className={theme.spacing.section}>
          <h2 className={cn(theme.text.cardHeader, 'flex items-center gap-2')}>
            <Briefcase className={cn('h-6 w-6', theme.colors.cyan.textLight)} />
            Progetti
            <span className={cn(theme.text.caption, theme.text.semibold, colors.text.light)}>
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
                    className={cn(
                      'absolute left-0 top-0 h-full transition-all duration-1000',
                      theme.gradient.cyanBlue
                    )}
                    style={{ width: `${progress}%` }}
                  ></div>

                  <div className={cn('relative z-10', theme.spacing.cardPadding)}>
                    {/* Header */}
                    <div className={cn(theme.layout.flexBetween, 'mb-3 items-start')}>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className={cn(theme.text.subtitle, colors.text.primary)}>
                            {project.name}
                          </h3>
                          {progress === 100 && (
                            <span className={cn(
                              theme.badge.base,
                              'bg-gradient-to-r from-emerald-500 to-green-700 shadow-lg'
                            )}>
                              <Award className="mr-1 inline h-3 w-3" />
                              COMPLETATO
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className={cn(theme.text.body, colors.text.secondary)}>
                            {project.description}
                          </p>
                        )}
                      </div>

                      {/* Health Indicator */}
                      <div className={cn(
                        'flex items-center gap-2 rounded-full px-3 py-1.5',
                        theme.border.default,
                        theme.colors.cyan.borderLight,
                        colors.bg.secondary
                      )}>
                        <div className={cn(
                          'h-2.5 w-2.5 rounded-full shadow-md',
                          theme.colors.cyan.solid
                        )}></div>
                        <span className={cn(
                          theme.text.caption,
                          theme.text.bold,
                          theme.colors.cyan.textBright
                        )}>
                          {progress}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className={cn(
                        'h-2.5 overflow-hidden rounded-full shadow-inner',
                        theme.border.default,
                        theme.colors.cyan.borderLight,
                        colors.bg.secondary
                      )}>
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-1000',
                            theme.gradient.cyanPurple,
                            'shadow-cyan-500/40'
                          )}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-3 grid grid-cols-3 gap-3">
                      <div className={cn(
                        theme.card.base,
                        theme.border.default,
                        theme.colors.cyan.borderLight,
                        colors.bg.secondary,
                        'p-2 text-center'
                      )}>
                        <Clock className={cn('mx-auto mb-1 h-4 w-4', theme.colors.cyan.textLight)} />
                        <p className={cn(theme.text.caption, theme.text.semibold, colors.text.secondary, 'mb-0.5')}>
                          Ore Lavorate
                        </p>
                        <p className={cn(
                          theme.text.subtitle,
                          isOverBudget ? theme.colors.error.text : colors.text.primary
                        )}>
                          {hoursWorked.toFixed(1)}h
                        </p>
                        {hoursEstimated > 0 && (
                          <p className={cn(theme.text.caption, theme.text.medium, colors.text.tertiary)}>
                            / {hoursEstimated}h stimate
                          </p>
                        )}
                      </div>

                      <div className={cn(
                        theme.card.base,
                        theme.border.default,
                        theme.colors.success.border,
                        colors.bg.secondary,
                        'p-2 text-center'
                      )}>
                        <Target className={cn('mx-auto mb-1 h-4 w-4', theme.colors.success.text)} />
                        <p className={cn(theme.text.caption, theme.text.semibold, colors.text.secondary, 'mb-0.5')}>
                          Task
                        </p>
                        <p className={cn(theme.text.subtitle, colors.text.primary)}>
                          {project.tasks?.filter((t) => t.status === 'completed').length || 0}
                          <span className={colors.text.tertiary}>/{project.tasks?.length || 0}</span>
                        </p>
                      </div>

                      <div className={cn(
                        theme.card.base,
                        theme.border.default,
                        'border-purple-500/30',
                        colors.bg.secondary,
                        'p-2 text-center'
                      )}>
                        <Users className="mx-auto mb-1 h-4 w-4 text-purple-400" />
                        <p className={cn(theme.text.caption, theme.text.semibold, colors.text.secondary, 'mb-0.5')}>
                          Team
                        </p>
                        <p className={cn(theme.text.subtitle, colors.text.primary)}>
                          {new Set(project.tasks?.map((t) => t.assigned_to)).size || 0}
                        </p>
                      </div>
                    </div>

                    {/* Tasks Preview */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div className={theme.spacing.stack.sm}>
                        <div className={cn(theme.layout.flexBetween, 'mb-1.5')}>
                          <span className={cn(theme.text.body, colors.text.primary)}>Task Recenti</span>
                          <ChevronRight className={cn(
                            'h-4 w-4 transition-colors',
                            colors.text.tertiary,
                            'group-hover:text-cyan-600 dark:group-hover:text-cyan-400'
                          )} />
                        </div>
                        <div className={theme.spacing.stack.xs}>
                          {project.tasks.slice(0, 3).map((task) => {
                            const statusConfig = getStatusConfig(task.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                              <div
                                key={task.id}
                                className={cn(
                                  'flex items-center gap-2 p-2 transition-all',
                                  theme.card.base,
                                  theme.border.default,
                                  theme.colors.cyan.borderLight,
                                  colors.bg.secondary,
                                  colors.bg.hover
                                )}
                              >
                                <StatusIcon
                                  className={`h-3.5 w-3.5 text-${statusConfig.color}-400 flex-shrink-0`}
                                />
                                <span className={cn(
                                  'flex-1 truncate',
                                  theme.text.body,
                                  theme.text.medium,
                                  colors.text.primary
                                )}>
                                  {task.title}
                                </span>
                                {task.period_seconds > 0 && (
                                  <span className={cn(theme.text.caption, theme.text.bold, theme.colors.cyan.text)}>
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
              <GamingCard className={cn(
                'relative overflow-hidden',
                theme.border.default,
                theme.colors.warning.border,
                colors.bg.secondary,
                'hover:border-orange-300 dark:hover:border-orange-500/20'
              )}>
                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className={cn('h-5 w-5', theme.colors.warning.textLight)} />
                    <h3 className={cn(theme.text.subtitle, colors.text.primary)}>
                      Task Senza Progetto
                    </h3>
                    <span className={cn(
                      theme.badge.base,
                      theme.colors.warning.borderLight,
                      theme.colors.warning.bg,
                      theme.colors.warning.text
                    )}>
                      {reportData.taskTree.filter((t) => !t.project_name).length}
                    </span>
                  </div>
                  <div className={theme.spacing.stack.xs}>
                    {reportData.taskTree
                      .filter((t) => !t.project_name)
                      .slice(0, 5)
                      .map((task) => {
                        const statusConfig = getStatusConfig(task.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              'flex items-center gap-2 p-2 transition-all',
                              theme.card.base,
                              theme.border.default,
                              theme.colors.cyan.borderLight,
                              colors.bg.secondary,
                              colors.bg.hover
                            )}
                          >
                            <StatusIcon className={`h-3.5 w-3.5 text-${statusConfig.color}-400`} />
                            <span className={cn(
                              'flex-1',
                              theme.text.body,
                              theme.text.medium,
                              'text-slate-200'
                            )}>
                              {task.title}
                            </span>
                            {task.period_seconds > 0 && (
                              <span className={cn(theme.text.caption, theme.text.bold, theme.colors.cyan.text)}>
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
          <div className={theme.spacing.section}>
            <h2 className={cn(theme.text.cardHeader, 'flex items-center gap-2')}>
              <Activity className={cn('h-6 w-6', theme.colors.cyan.text)} />
              Timeline Attività
            </h2>

            <GamingCard>
              <div className={theme.spacing.stack.md}>
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
                          className={cn(
                            'flex cursor-pointer items-center gap-3 p-2.5 transition-all',
                            theme.card.base,
                            theme.border.default,
                            theme.colors.cyan.borderLight,
                            colors.bg.tertiary,
                            colors.bg.hover,
                            isSubtask && 'ml-8'
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Indent indicator for subtasks */}
                          {isSubtask && (
                            <div className="flex flex-shrink-0 items-center">
                              <div className="flex h-6 w-6 items-center justify-center">
                                <div className={cn('h-px w-4', theme.colors.cyan.bg)}></div>
                                <ChevronRight className={cn('-ml-1 h-3 w-3', theme.colors.cyan.text)} />
                              </div>
                            </div>
                          )}

                          {/* Status Icon */}
                          <div
                            className={cn(
                              'flex-shrink-0 rounded-full flex items-center justify-center shadow-md',
                              isSubtask ? 'h-6 w-6' : 'h-8 w-8',
                              `bg-gradient-to-br ${statusConfig.gradient}`
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                'text-white',
                                isSubtask ? 'h-3 w-3' : 'h-4 w-4'
                              )}
                            />
                          </div>

                          {/* Task Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={cn(
                                'truncate text-slate-100',
                                theme.text.semibold,
                                isSubtask ? theme.text.caption : theme.text.body
                              )}>
                                {task.title}
                              </h4>
                              {task.assigned_to_name && (
                                <span className={cn(theme.text.caption, 'flex items-center gap-1 text-slate-400')}>
                                  <span>•</span>
                                  <Users className="h-3 w-3" />
                                  <span className={theme.text.medium}>{task.assigned_to_name}</span>
                                </span>
                              )}
                              {hasSubtasks && (
                                <span className={cn(
                                  theme.badge.base,
                                  theme.colors.cyan.borderLight,
                                  theme.colors.cyan.bg,
                                  theme.colors.cyan.textLight
                                )}>
                                  {subtasks.length} sub
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          {task.period_seconds > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <div className={cn(
                                theme.text.bold,
                                theme.colors.cyan.text,
                                isSubtask ? theme.text.body : theme.text.base
                              )}>
                                {formatTime(task.period_seconds)}
                              </div>
                              <div className={cn(theme.text.caption, theme.text.medium, 'text-slate-400')}>
                                ore
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Render subtasks */}
                        {subtasks.length > 0 && (
                          <div className={cn('mt-1.5', theme.spacing.stack.sm)}>
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
                      <div key={projectName} className={theme.spacing.stack.sm}>
                        {/* Project Header */}
                        <div className={cn(
                          'flex items-center justify-between rounded-lg border-l-4 px-3 py-2 shadow-sm',
                          theme.colors.cyan.border,
                          colors.bg.tertiary
                        )}>
                          <div className="flex items-center gap-2">
                            <Briefcase className={cn('h-5 w-5', theme.colors.cyan.text)} />
                            <h3 className={cn(theme.text.body, theme.text.bold, colors.text.primary)}>
                              {projectName}
                            </h3>
                            <span className={cn(
                              theme.badge.base,
                              theme.colors.cyan.borderLight,
                              colors.bg.primary,
                              theme.colors.cyan.textLight
                            )}>
                              {tasks.length} task
                            </span>
                          </div>
                          {totalTime > 0 && (
                            <div className={cn('flex items-center gap-1', theme.colors.cyan.text)}>
                              <Clock className="h-4 w-4" />
                              <span className={cn(theme.text.body, theme.text.bold)}>
                                {formatTime(totalTime)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Tasks in this project */}
                        <div className={theme.spacing.stack.sm}>
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
