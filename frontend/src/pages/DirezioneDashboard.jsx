import { useState, useEffect, useMemo, useCallback } from 'react';
import { Briefcase, Clock, AlertCircle, HelpCircle, CheckCircle, TrendingUp, TrendingDown, Users, Calendar, LayoutDashboard, FolderKanban, UserCheck, Bell } from 'lucide-react';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskModal from '../components/TaskModal';
import { Card, StatCard, StatCardGrid } from '../components/ui';
import AlertsPanel from '../components/management/AlertsPanel';
import ProjectHealthCard from '../components/management/ProjectHealthCard';
import TimelineView from '../components/management/TimelineView';
import BurndownChart from '../components/management/BurndownChart';
import FilterBar from '../components/common/FilterBar';
import KanbanBoard from '../components/common/KanbanBoard';
import TaskDistributionChart from '../components/charts/TaskDistributionChart';
import ProgressChart from '../components/charts/ProgressChart';
import WorkloadChart from '../components/charts/WorkloadChart';
import VelocityChart from '../components/charts/VelocityChart';
import { formatTime, formatTimeToHours } from '../utils/helpers';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-900">
            Dashboard Direzione
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            Monitoraggio completo progetti e team
          </p>
        </div>

        {/* Stats */}
        <StatCardGrid columns={6} compact className="mb-4">
          <StatCard title="Task Totali" value={stats.total} icon={Briefcase} variant="default" compact />
          <StatCard title="In Corso" value={stats.in_progress} variant="flat" iconBg="bg-blue-100" iconColor="text-blue-600" compact />
          <StatCard title="Bloccati" value={stats.blocked} icon={AlertCircle} variant="flat" iconBg="bg-red-100" iconColor="text-red-600" compact />
          <StatCard title="In Attesa" value={stats.waiting} icon={HelpCircle} variant="flat" iconBg="bg-yellow-100" iconColor="text-yellow-600" compact />
          <StatCard title="Completati" value={stats.completed} icon={CheckCircle} variant="flat" iconBg="bg-green-100" iconColor="text-green-600" compact />
          <StatCard title="Tempo Totale" value={formatTime(stats.totalTime)} icon={Clock} variant="default" compact />
        </StatCardGrid>

        {/* Advanced Metrics */}
        <StatCardGrid columns={4} compact className="mb-4">
          <StatCard
            title="Tempo medio completamento"
            value={`${metrics.avgCompletionTime.toFixed(1)}h`}
            icon={Clock}
            variant="flat"
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            compact
          />
          <Card padding="sm" className={metrics.overdueTasks > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}>
            <div className="flex items-center justify-between mb-1">
              <Calendar className={`w-4 h-4 ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
              <span className={`text-xs font-medium ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                SCADENZE
              </span>
            </div>
            <div className={`text-2xl font-bold ${metrics.overdueTasks > 0 ? 'text-red-900' : 'text-green-900'}`}>
              {metrics.overdueTasks > 0 ? metrics.overdueTasks : '0'}
            </div>
            <div className={`text-xs ${metrics.overdueTasks > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {metrics.overdueTasks > 0 ? `In ritardo (${metrics.overdueRate.toFixed(0)}%)` : 'Nessun ritardo'}
            </div>
          </Card>
          <StatCard
            title={`Trend settimanale`}
            subtitle={`${metrics.thisWeekCompleted} vs ${metrics.lastWeekCompleted}`}
            value={`${metrics.weeklyTrend >= 0 ? '+' : ''}${metrics.weeklyTrend.toFixed(0)}%`}
            icon={metrics.weeklyTrend >= 0 ? TrendingUp : TrendingDown}
            variant="flat"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            trendDirection={metrics.weeklyTrend >= 0 ? 'up' : 'down'}
            compact
          />
          <StatCard
            title="Progetti attivi"
            value={projects.length}
            icon={Briefcase}
            variant="flat"
            iconBg="bg-cyan-100"
            iconColor="text-cyan-600"
            compact
          />
        </StatCardGrid>

        {/* Filters */}
        <FilterBar filters={filters} onFilterChange={setFilters} showEmployeeFilter={true} />

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

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
                  <TaskDistributionChart tasks={filteredTasks} />
                  <ProgressChart progressData={progressData} title="Progresso Ultimi 7 Giorni" />
                </div>

                {/* Charts Row 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WorkloadChart workloadData={workloadData} />
                  <VelocityChart velocityData={velocityData} />
                </div>

                {/* Kanban View */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
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
                <WorkloadChart workloadData={workloadData} title="Carico di Lavoro Team" />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {users.filter(u => u.role === 'dipendente').map(user => {
                    const userTasks = filteredTasks.filter(t => t.assigned_to === user.id);
                    const completedTasks = userTasks.filter(t => t.status === 'completed');
                    const completionRate = userTasks.length > 0
                      ? (completedTasks.length / userTasks.length) * 100
                      : 0;

                    return (
                      <Card key={user.id} hover>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {user.first_name} {user.last_name}
                            </h4>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Task totali:</span>
                            <span className="font-medium">{userTasks.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Completati:</span>
                            <span className="font-medium text-green-600">{completedTasks.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">In corso:</span>
                            <span className="font-medium text-blue-600">
                              {userTasks.filter(t => t.status === 'in_progress').length}
                            </span>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Tasso completamento</span>
                              <span className="font-semibold text-gray-900">{completionRate.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
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
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadData}
        />
      )}
    </div>
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
      <Card>
        <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
      </Card>
    );
  }

  if (!velocityData) {
    return (
      <Card>
        <p className="text-center py-8 text-gray-500">Nessun dato disponibile per {project.name}</p>
      </Card>
    );
  }

  return <BurndownChart projectId={project.id} velocityData={velocityData} />;
}
