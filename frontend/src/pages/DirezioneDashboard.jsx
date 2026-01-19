import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  Briefcase,
  Clock,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  LayoutDashboard,
  FolderKanban,
  UserCheck,
  Bell,
  ClipboardList,
  Zap,
  Target,
} from 'lucide-react';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import TaskModal from '../components/TaskModal';
import {
  StatCard,
  StatCardGrid,
  GamingLayout,
  GamingHeader,
  GamingCard,
  GamingKPICard,
  GamingKPIGrid,
} from '../components/ui';
import AlertsPanel from '../components/management/AlertsPanel';
import ProjectHealthCard from '../components/management/ProjectHealthCard';
import TimelineView from '../components/management/TimelineView';
import BurndownChart from '../components/management/BurndownChart';
import FilterBar from '../components/common/FilterBar';
import KanbanBoard from '../components/common/KanbanBoard';
import { formatTime, formatTimeToHours } from '../utils/helpers';

// Lazy load chart components to defer Chart.js loading
const TaskDistributionChart = lazy(() => import('../components/charts/TaskDistributionChart'));
const ProgressChart = lazy(() => import('../components/charts/ProgressChart'));
const WorkloadChart = lazy(() => import('../components/charts/WorkloadChart'));
const VelocityChart = lazy(() => import('../components/charts/VelocityChart'));

export default function DirezioneDashboard() {
  const { colors, spacing } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [filters, setFilters] = useState({
    timeRange: 'all',
    userId: 'all',
    projectId: 'all',
    status: 'all',
  });

  // Management dashboard data
  const [alerts, setAlerts] = useState(null);
  const [projectsWithHealth, setProjectsWithHealth] = useState([]);
  const [timelineData, setTimelineData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, usersRes, alertsRes, healthRes, timelineRes] =
        await Promise.all([
          tasksApi.getAll(),
          projectsApi.getAll(),
          usersApi.getAll({ active: true }),
          tasksApi.getManagementAlerts(),
          projectsApi.getAllWithHealth(),
          projectsApi.getTimeline(),
        ]);

      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(tasksData);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
      setAlerts(alertsRes.data);
      setProjectsWithHealth(healthRes.data);
      setTimelineData(timelineRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize chart data to avoid recalculation on every render
  const progressData = useMemo(() => {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const completed = tasks.filter((t) => {
        if (!t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;

      const total = tasks.filter((t) => {
        const createdDate = new Date(t.created_at);
        return createdDate <= date;
      }).length;

      last7Days.push({ date: dateStr, completed, total });
    }

    return last7Days;
  }, [tasks]);

  const workloadData = useMemo(() => {
    const employees = users.filter((u) => u.role === 'dipendente');
    return employees.map((emp) => {
      const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
      return {
        name: `${emp.first_name} ${emp.last_name}`,
        todo: empTasks.filter((t) => t.status === 'todo').length,
        in_progress: empTasks.filter((t) => t.status === 'in_progress').length,
        completed: empTasks.filter((t) => t.status === 'completed').length,
      };
    });
  }, [tasks, users]);

  const velocityData = useMemo(() => {
    const velocityWeeks = [];
    const today = new Date();
    const totalTasks = tasks.length;

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const weekLabel = `S${4 - i}`;
      const completedUpToWeek = tasks.filter((t) => {
        if (!t.completed_at) return false;
        return new Date(t.completed_at) <= weekStart;
      }).length;

      const remaining = totalTasks - completedUpToWeek;
      const ideal = totalTasks - (totalTasks / 4) * (4 - i);

      velocityWeeks.push({
        week: weekLabel,
        tasksCompleted: completedUpToWeek,
        tasksRemaining: remaining,
        ideal: Math.max(0, Math.round(ideal)),
      });
    }

    return velocityWeeks;
  }, [tasks]);

  // Memoize filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Time range filter
      if (filters.timeRange !== 'all') {
        const taskDate = new Date(task.created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filters.timeRange === 'today') {
          const todayStart = new Date(today);
          if (taskDate < todayStart) return false;
        } else if (filters.timeRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (taskDate < weekAgo) return false;
        } else if (filters.timeRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (taskDate < monthAgo) return false;
        }
      }

      // User filter
      if (filters.userId !== 'all' && task.assigned_to !== parseInt(filters.userId)) {
        return false;
      }

      // Project filter
      if (filters.projectId !== 'all' && task.project_id !== parseInt(filters.projectId)) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Memoize stats calculation
  const stats = useMemo(
    () => ({
      total: filteredTasks.length,
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress').length,
      blocked: filteredTasks.filter((t) => t.status === 'blocked').length,
      waiting: filteredTasks.filter((t) => t.status === 'waiting_clarification').length,
      completed: filteredTasks.filter((t) => t.status === 'completed').length,
      totalTime: filteredTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0),
    }),
    [filteredTasks]
  );

  // Memoize metrics calculation
  const metrics = useMemo(() => {
    const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

    const avgCompletionTime =
      completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0) /
          completedTasks.length /
          3600
        : 0;

    const tasksWithDeadline = filteredTasks.filter((t) => t.deadline && t.status !== 'completed');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasksWithDeadline.filter((t) => {
      const deadline = new Date(t.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    });

    const overdueRate =
      tasksWithDeadline.length > 0 ? (overdueTasks.length / tasksWithDeadline.length) * 100 : 0;

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekCompleted = completedTasks.filter((t) => {
      const completedDate = new Date(t.completed_at);
      return completedDate >= oneWeekAgo;
    }).length;

    const lastWeekCompleted = completedTasks.filter((t) => {
      const completedDate = new Date(t.completed_at);
      return completedDate >= twoWeeksAgo && completedDate < oneWeekAgo;
    }).length;

    const weeklyTrend =
      lastWeekCompleted > 0
        ? ((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100
        : thisWeekCompleted > 0
          ? 100
          : 0;

    return {
      avgCompletionTime,
      overdueRate,
      overdueTasks: overdueTasks.length,
      thisWeekCompleted,
      lastWeekCompleted,
      weeklyTrend,
    };
  }, [filteredTasks]);

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await tasksApi.update(taskId, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Progetti', icon: FolderKanban },
    { id: 'team', label: 'Team', icon: UserCheck },
    { id: 'alerts', label: 'Alert', icon: Bell },
  ];

  return (
    <GamingLayout>
      <GamingHeader
        title="Dashboard Direzione"
        subtitle="Monitoraggio progetti e team in tempo reale"
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <GamingKPIGrid columns={6}>
        <GamingKPICard
          title="Totali"
          value={stats.total}
          icon={ClipboardList}
          gradient="from-purple-600 to-pink-700"
          shadowColor="purple"
        />
        <GamingKPICard
          title="In Corso"
          value={stats.in_progress}
          icon={Zap}
          gradient="from-blue-600 to-cyan-700"
          shadowColor="blue"
        />
        <GamingKPICard
          title="Bloccati"
          value={stats.blocked}
          icon={AlertCircle}
          gradient="from-slate-600 to-slate-800"
          shadowColor="slate"
        />
        <GamingKPICard
          title="In Attesa"
          value={stats.waiting}
          icon={HelpCircle}
          gradient="from-yellow-600 to-orange-700"
          shadowColor="orange"
        />
        <GamingKPICard
          title="Completati"
          value={stats.completed}
          icon={CheckCircle}
          gradient="from-emerald-600 to-green-700"
          shadowColor="emerald"
        />
        <GamingKPICard
          title="Tempo"
          value={formatTime(stats.totalTime)}
          icon={Clock}
          gradient="from-indigo-600 to-violet-700"
          shadowColor="indigo"
        />
      </GamingKPIGrid>

      {/* Advanced Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <GamingCard className={`border ${colors.border} ${colors.bg.secondary} ${spacing.padding.md}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${colors.text.secondary}`}>Tempo Medio</p>
              <p className={`text-xl font-bold ${colors.text.primary}`}>
                {metrics.avgCompletionTime.toFixed(1)}h
              </p>
            </div>
          </div>
        </GamingCard>
        <GamingCard
          className={`${spacing.cardP} border ${metrics.overdueTasks > 0 ? 'border-red-500/50 dark:border-red-500/50' : 'border-emerald-500/50 dark:border-emerald-500/50'} ${colors.bg.secondary}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 bg-gradient-to-br ${metrics.overdueTasks > 0 ? 'from-red-600 to-red-700' : 'from-emerald-600 to-green-700'} flex items-center justify-center rounded-lg`}
            >
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${colors.text.secondary}`}>Scadenze</p>
              <p
                className={`text-xl font-bold ${metrics.overdueTasks > 0 ? 'text-red-300' : 'text-emerald-300'}`}
              >
                {metrics.overdueTasks > 0 ? metrics.overdueTasks : '0'}
              </p>
              <p
                className={`text-xs ${metrics.overdueTasks > 0 ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {metrics.overdueTasks > 0
                  ? `In ritardo (${metrics.overdueRate.toFixed(0)}%)`
                  : 'Nessun ritardo'}
              </p>
            </div>
          </div>
        </GamingCard>
        <GamingCard className={`border ${colors.border} ${colors.bg.secondary} ${spacing.cardP}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-700">
              {metrics.weeklyTrend >= 0 ? (
                <TrendingUp className="h-5 w-5 text-white" />
              ) : (
                <TrendingDown className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <p className={`text-xs font-semibold ${colors.text.secondary}`}>Trend Settimanale</p>
              <p className={`text-xl font-bold ${colors.text.primary}`}>
                {metrics.weeklyTrend >= 0 ? '+' : ''}
                {metrics.weeklyTrend.toFixed(0)}%
              </p>
              <p className={`text-xs ${colors.text.secondary}`}>
                {metrics.thisWeekCompleted} vs {metrics.lastWeekCompleted}
              </p>
            </div>
          </div>
        </GamingCard>
        <GamingCard className={`border ${colors.border} ${colors.bg.secondary} ${spacing.cardP}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-600 to-amber-700">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${colors.text.secondary}`}>Progetti Attivi</p>
              <p className={`text-xl font-bold ${colors.text.primary}`}>{projects.length}</p>
            </div>
          </div>
        </GamingCard>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} showEmployeeFilter={true} />

      {/* Tabs Navigation */}
      <GamingCard className="mb-6 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const emojis = { overview: '🎯', projects: '📁', team: '👥', alerts: '🔔' };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? 'flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 font-bold text-white shadow-xl transition-all hover:shadow-2xl'
                    : 'flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800/60'
                }
              >
                <span className="text-base">{emojis[tab.id]}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </GamingCard>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-6">
          <div className={`animate-pulse rounded-lg border ${colors.border} ${colors.bg.secondary} p-8`}>
            <div className={`h-64 rounded ${colors.bg.tertiary}`}></div>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in space-y-6">
              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-slate-500 shadow-md">
                      Caricamento grafico...
                    </div>
                  }
                >
                  <TaskDistributionChart tasks={filteredTasks} />
                </Suspense>
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-slate-500 shadow-md">
                      Caricamento grafico...
                    </div>
                  }
                >
                  <ProgressChart progressData={progressData} title="Progresso Ultimi 7 Giorni" />
                </Suspense>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-slate-500 shadow-md">
                      Caricamento grafico...
                    </div>
                  }
                >
                  <WorkloadChart workloadData={workloadData} />
                </Suspense>
                <Suspense
                  fallback={
                    <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-slate-500 shadow-md">
                      Caricamento grafico...
                    </div>
                  }
                >
                  <VelocityChart velocityData={velocityData} />
                </Suspense>
              </div>

              {/* Kanban View */}
              <div>
                <h3 className="mb-4 text-xl font-bold text-slate-900">
                  Vista Kanban Task ({filteredTasks.length})
                </h3>
                <KanbanBoard
                  tasks={filteredTasks}
                  onTaskClick={setSelectedTask}
                  onTaskUpdate={handleTaskUpdate}
                />
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="animate-fade-in space-y-6">
              {/* Project Health */}
              {projectsWithHealth.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">Salute Progetti</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projectsWithHealth.map((project) => (
                      <ProjectHealthCard key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {timelineData.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">Roadmap Progetti</h3>
                  <TimelineView projects={timelineData} />
                </div>
              )}

              {/* Burndown Chart */}
              {projectsWithHealth.length > 0 && (
                <div>
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">Burndown Chart</h3>
                  <div className="grid gap-6">
                    {projectsWithHealth.map((project) => (
                      <BurndownChartWrapper key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="animate-fade-in space-y-6">
              <Suspense
                fallback={
                  <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-6 text-slate-500 shadow-md">
                    Caricamento grafico...
                  </div>
                }
              >
                <WorkloadChart workloadData={workloadData} title="Carico di Lavoro Team" />
              </Suspense>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users
                  .filter((u) => u.role === 'dipendente')
                  .map((user) => {
                    const userTasks = filteredTasks.filter((t) => t.assigned_to === user.id);
                    const completedTasks = userTasks.filter((t) => t.status === 'completed');
                    const completionRate =
                      userTasks.length > 0 ? (completedTasks.length / userTasks.length) * 100 : 0;

                    return (
                      <GamingCard
                        key={user.id}
                        className="border border-slate-800 bg-slate-900/60 transition-all hover:shadow-xl"
                      >
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-600 to-blue-700">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">
                              {user.first_name} {user.last_name}
                            </h4>
                            <p className="text-sm font-medium text-slate-300">{user.email}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-300">Task totali:</span>
                            <span className="font-bold text-white">{userTasks.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-300">Completati:</span>
                            <span className="font-bold text-emerald-300">
                              {completedTasks.length}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-300">In corso:</span>
                            <span className="font-bold text-cyan-300">
                              {userTasks.filter((t) => t.status === 'in_progress').length}
                            </span>
                          </div>
                          <div className="mt-3 border-t border-slate-700/60 pt-3">
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="font-semibold text-slate-300">
                                Tasso completamento
                              </span>
                              <span className="font-bold text-white">
                                {completionRate.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full border border-slate-700 bg-slate-800">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </GamingCard>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="animate-fade-in space-y-6">
              {alerts && <AlertsPanel alerts={alerts} onTaskClick={setSelectedTask} />}
            </div>
          )}
        </>
      )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={loadData} />
      )}
    </GamingLayout>
  );
}

// Helper component for Burndown Chart
function BurndownChartWrapper({ project }) {
  const [velocityData, setVelocityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [project.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await projectsApi.getVelocity(project.id, 8);
      setVelocityData(response.data);
    } catch (error) {
      console.error('Error loading burndown data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GamingCard>
        <div className="h-64 animate-pulse rounded bg-slate-200"></div>
      </GamingCard>
    );
  }

  if (!velocityData) {
    return (
      <GamingCard>
        <p className="py-8 text-center font-medium text-slate-600">
          Nessun dato disponibile per {project.name}
        </p>
      </GamingCard>
    );
  }

  return <BurndownChart projectId={project.id} velocityData={velocityData} />;
}
