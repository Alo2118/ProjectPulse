import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Briefcase, Clock, AlertCircle, HelpCircle, CheckCircle, TrendingUp, TrendingDown, Users, Calendar, LayoutDashboard, FolderKanban, UserCheck, Bell, ClipboardList, Zap, Target } from 'lucide-react';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import TaskModal from '../components/TaskModal';
import { StatCard, StatCardGrid, GamingLayout, GamingHeader, GamingCard, GamingKPICard, GamingKPIGrid } from '../components/ui';
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
    status: 'all'
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
      const [tasksRes, projectsRes, usersRes, alertsRes, healthRes, timelineRes] = await Promise.all([
        tasksApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll({ active: true }),
        tasksApi.getManagementAlerts(),
        projectsApi.getAllWithHealth(),
        projectsApi.getTimeline()
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
      const completed = tasks.filter(t => {
        if (!t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;

      const total = tasks.filter(t => {
        const createdDate = new Date(t.created_at);
        return createdDate <= date;
      }).length;

      last7Days.push({ date: dateStr, completed, total });
    }

    return last7Days;
  }, [tasks]);

  const workloadData = useMemo(() => {
    const employees = users.filter(u => u.role === 'dipendente');
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assigned_to === emp.id);
      return {
        name: `${emp.first_name} ${emp.last_name}`,
        todo: empTasks.filter(t => t.status === 'todo').length,
        in_progress: empTasks.filter(t => t.status === 'in_progress').length,
        completed: empTasks.filter(t => t.status === 'completed').length
      };
    });
  }, [tasks, users]);

  const velocityData = useMemo(() => {
    const velocityWeeks = [];
    const today = new Date();
    const totalTasks = tasks.length;

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));

      const weekLabel = `S${4 - i}`;
      const completedUpToWeek = tasks.filter(t => {
        if (!t.completed_at) return false;
        return new Date(t.completed_at) <= weekStart;
      }).length;

      const remaining = totalTasks - completedUpToWeek;
      const ideal = totalTasks - (totalTasks / 4) * (4 - i);

      velocityWeeks.push({
        week: weekLabel,
        tasksCompleted: completedUpToWeek,
        tasksRemaining: remaining,
        ideal: Math.max(0, Math.round(ideal))
      });
    }

    return velocityWeeks;
  }, [tasks]);

  // Memoize filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
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
  const stats = useMemo(() => ({
    total: filteredTasks.length,
    in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
    blocked: filteredTasks.filter(t => t.status === 'blocked').length,
    waiting: filteredTasks.filter(t => t.status === 'waiting_clarification').length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    totalTime: filteredTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  }), [filteredTasks]);

  // Memoize metrics calculation
  const metrics = useMemo(() => {
    const completedTasks = filteredTasks.filter(t => t.status === 'completed');

    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0) / completedTasks.length / 3600
      : 0;

    const tasksWithDeadline = filteredTasks.filter(t => t.deadline && t.status !== 'completed');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasksWithDeadline.filter(t => {
      const deadline = new Date(t.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    });

    const overdueRate = tasksWithDeadline.length > 0
      ? (overdueTasks.length / tasksWithDeadline.length) * 100
      : 0;

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekCompleted = completedTasks.filter(t => {
      const completedDate = new Date(t.completed_at);
      return completedDate >= oneWeekAgo;
    }).length;

    const lastWeekCompleted = completedTasks.filter(t => {
      const completedDate = new Date(t.completed_at);
      return completedDate >= twoWeeksAgo && completedDate < oneWeekAgo;
    }).length;

    const weeklyTrend = lastWeekCompleted > 0
      ? ((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100
      : thisWeekCompleted > 0 ? 100 : 0;

    return {
      avgCompletionTime,
      overdueRate,
      overdueTasks: overdueTasks.length,
      thisWeekCompleted,
      lastWeekCompleted,
      weeklyTrend
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
    { id: 'alerts', label: 'Alert', icon: Bell }
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
        <GamingKPICard title="Totali" value={stats.total} icon={ClipboardList} gradient="from-purple-600 to-pink-700" shadowColor="purple" />
        <GamingKPICard title="In Corso" value={stats.in_progress} icon={Zap} gradient="from-blue-600 to-cyan-700" shadowColor="blue" />
        <GamingKPICard title="Bloccati" value={stats.blocked} icon={AlertCircle} gradient="from-slate-600 to-slate-800" shadowColor="slate" />
        <GamingKPICard title="In Attesa" value={stats.waiting} icon={HelpCircle} gradient="from-yellow-600 to-orange-700" shadowColor="orange" />
        <GamingKPICard title="Completati" value={stats.completed} icon={CheckCircle} gradient="from-emerald-600 to-green-700" shadowColor="emerald" />
        <GamingKPICard title="Tempo" value={formatTime(stats.totalTime)} icon={Clock} gradient="from-indigo-600 to-violet-700" shadowColor="indigo" />
      </GamingKPIGrid>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GamingCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Tempo Medio</p>
              <p className="text-xl font-bold text-slate-900">{metrics.avgCompletionTime.toFixed(1)}h</p>
            </div>
          </div>
        </GamingCard>
        <GamingCard className={`p-4 ${metrics.overdueTasks > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${metrics.overdueTasks > 0 ? 'from-red-100 to-red-200' : 'from-green-100 to-green-200'} rounded-lg flex items-center justify-center`}>
              <Calendar className={`w-5 h-5 ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Scadenze</p>
              <p className={`text-xl font-bold ${metrics.overdueTasks > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {metrics.overdueTasks > 0 ? metrics.overdueTasks : '0'}
              </p>
              <p className={`text-xs ${metrics.overdueTasks > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {metrics.overdueTasks > 0 ? `In ritardo (${metrics.overdueRate.toFixed(0)}%)` : 'Nessun ritardo'}
              </p>
            </div>
          </div>
        </GamingCard>
        <GamingCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              {metrics.weeklyTrend >= 0 ? <TrendingUp className="w-5 h-5 text-purple-600" /> : <TrendingDown className="w-5 h-5 text-purple-600" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Trend Settimanale</p>
              <p className="text-xl font-bold text-slate-900">{metrics.weeklyTrend >= 0 ? '+' : ''}{metrics.weeklyTrend.toFixed(0)}%</p>
              <p className="text-xs text-slate-600">{metrics.thisWeekCompleted} vs {metrics.lastWeekCompleted}</p>
            </div>
          </div>
        </GamingCard>
        <GamingCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">Progetti Attivi</p>
              <p className="text-xl font-bold text-slate-900">{projects.length}</p>
            </div>
          </div>
        </GamingCard>
      </div>

        {/* Filters */}
        <FilterBar filters={filters} onFilterChange={setFilters} showEmployeeFilter={true} />

      {/* Tabs Navigation */}
      <GamingCard className="p-2 mb-6">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const emojis = {overview: '🎯', projects: '📁', team: '👥', alerts: '🔔'};
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id 
                  ? 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-bold transition-all shadow-xl hover:shadow-2xl' 
                  : 'flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all font-semibold'}
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
            <div className="animate-pulse bg-white rounded-lg p-8">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <TaskDistributionChart tasks={filteredTasks} />
                  </Suspense>
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <ProgressChart progressData={progressData} title="Progresso Ultimi 7 Giorni" />
                  </Suspense>
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <WorkloadChart workloadData={workloadData} />
                  </Suspense>
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <VelocityChart velocityData={velocityData} />
                  </Suspense>
                </div>

                {/* Kanban View */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">
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
              <div className="space-y-6 animate-fade-in">
                {/* Project Health */}
                {projectsWithHealth.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Salute Progetti
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {projectsWithHealth.map(project => (
                        <ProjectHealthCard key={project.id} project={project} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {timelineData.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Roadmap Progetti
                    </h3>
                    <TimelineView projects={timelineData} />
                  </div>
                )}

                {/* Burndown Chart */}
                {projectsWithHealth.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Burndown Chart
                    </h3>
                    <div className="grid gap-6">
                      {projectsWithHealth.map(project => (
                        <BurndownChartWrapper key={project.id} project={project} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-6 animate-fade-in">
                <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                  <WorkloadChart workloadData={workloadData} title="Carico di Lavoro Team" />
                </Suspense>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.filter(u => u.role === 'dipendente').map(user => {
                    const userTasks = filteredTasks.filter(t => t.assigned_to === user.id);
                    const completedTasks = userTasks.filter(t => t.status === 'completed');
                    const completionRate = userTasks.length > 0
                      ? (completedTasks.length / userTasks.length) * 100
                      : 0;

                    return (
                      <GamingCard key={user.id} className="hover:shadow-xl transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center border-2 border-blue-200">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {user.first_name} {user.last_name}
                            </h4>
                            <p className="text-sm font-medium text-slate-600">{user.email}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-700">Task totali:</span>
                            <span className="font-bold text-slate-900">{userTasks.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-700">Completati:</span>
                            <span className="font-bold text-emerald-600">{completedTasks.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold text-slate-700">In corso:</span>
                            <span className="font-bold text-blue-600">
                              {userTasks.filter(t => t.status === 'in_progress').length}
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t-2 border-slate-200">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-semibold text-slate-700">Tasso completamento</span>
                              <span className="font-bold text-slate-900">{completionRate.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 border-2 border-slate-300">
                              <div
                                className="bg-gradient-to-r from-primary-600 to-primary-700 h-2 rounded-full transition-all"
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
              <div className="space-y-6 animate-fade-in">
                {alerts && <AlertsPanel alerts={alerts} onTaskClick={setSelectedTask} />}
              </div>
            )}
          </>
        )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadData}
        />
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
        <div className="animate-pulse h-64 bg-slate-200 rounded"></div>
      </GamingCard>
    );
  }

  if (!velocityData) {
    return (
      <GamingCard>
        <p className="text-center py-8 font-medium text-slate-600">Nessun dato disponibile per {project.name}</p>
      </GamingCard>
    );
  }

  return <BurndownChart projectId={project.id} velocityData={velocityData} />;
}
