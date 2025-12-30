import { useState, useEffect } from 'react';
import { Briefcase, Clock, AlertCircle, HelpCircle, CheckCircle, TrendingUp, TrendingDown, Users, Calendar } from 'lucide-react';
import { tasksApi, projectsApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';

export default function DirezioneDashboard() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.getAll(),
        projectsApi.getAll()
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterProject !== 'all' && task.project_id !== parseInt(filterProject)) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    waiting: tasks.filter(t => t.status === 'waiting_clarification').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    totalTime: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  // Calculate advanced metrics
  const calculateMetrics = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed');

    // Average time to complete (in hours)
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0) / completedTasks.length / 3600
      : 0;

    // Tasks with deadline
    const tasksWithDeadline = tasks.filter(t => t.deadline && t.status !== 'completed');
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

    // Tasks completed this week vs last week
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
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              Dashboard Direzione R&D
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              Monitoraggio progetti di sviluppo dispositivi ortopedici e strumentario chirurgico
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="card text-center hover:shadow-lg transition-shadow">
              <Briefcase className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Task Totali</div>
            </div>

            <div className="card text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
              <div className="text-2xl font-bold text-blue-700">{stats.in_progress}</div>
              <div className="text-sm text-blue-600">In Corso</div>
            </div>

            <div className="card text-center bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-shadow">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">{stats.blocked}</div>
              <div className="text-sm text-red-600">Bloccati</div>
            </div>

            <div className="card text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow">
              <HelpCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{stats.waiting}</div>
              <div className="text-sm text-yellow-600">In Attesa</div>
            </div>

            <div className="card text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
              <div className="text-sm text-green-600">Completati</div>
            </div>

            <div className="card text-center hover:shadow-lg transition-shadow">
              <Clock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTime)}</div>
              <div className="text-sm text-gray-500">Tempo Totale</div>
            </div>
          </div>

          {/* Advanced Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Average Completion Time */}
            <div className="card bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span className="text-xs text-indigo-600 font-medium">MEDIA</span>
              </div>
              <div className="text-2xl font-bold text-indigo-900">
                {metrics.avgCompletionTime.toFixed(1)}h
              </div>
              <div className="text-sm text-indigo-700">Tempo medio completamento</div>
            </div>

            {/* Overdue Tasks */}
            <div className={`card border-2 hover:shadow-lg transition-shadow ${
              metrics.overdueTasks > 0
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
                : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <Calendar className={`w-5 h-5 ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
                <span className={`text-xs font-medium ${metrics.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  SCADENZE
                </span>
              </div>
              <div className={`text-2xl font-bold ${metrics.overdueTasks > 0 ? 'text-red-900' : 'text-green-900'}`}>
                {metrics.overdueTasks > 0 ? metrics.overdueTasks : '0'}
              </div>
              <div className={`text-sm ${metrics.overdueTasks > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {metrics.overdueTasks > 0
                  ? `In ritardo (${metrics.overdueRate.toFixed(0)}%)`
                  : 'Nessun ritardo'
                }
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                {metrics.weeklyTrend >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-purple-600" />
                )}
                <span className="text-xs text-purple-600 font-medium">TREND</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {metrics.weeklyTrend >= 0 ? '+' : ''}{metrics.weeklyTrend.toFixed(0)}%
              </div>
              <div className="text-sm text-purple-700">
                vs settimana scorsa ({metrics.thisWeekCompleted} vs {metrics.lastWeekCompleted})
              </div>
            </div>

            {/* Active Projects */}
            <div className="card bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Briefcase className="w-5 h-5 text-cyan-600" />
                <span className="text-xs text-cyan-600 font-medium">PROGETTI</span>
              </div>
              <div className="text-2xl font-bold text-cyan-900">{projects.length}</div>
              <div className="text-sm text-cyan-700">Progetti R&D attivi</div>
            </div>
          </div>

          {/* Filters */}
          <div className="card shadow-md hover:shadow-lg transition-shadow">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtra per stato
                </label>
                <select
                  className="input"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="todo">Da fare</option>
                  <option value="in_progress">In corso</option>
                  <option value="blocked">Bloccati</option>
                  <option value="waiting_clarification">In attesa</option>
                  <option value="completed">Completati</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtra per progetto
                </label>
                <select
                  className="input"
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                >
                  <option value="all">Tutti i progetti</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-300 rounded w-32 mb-4"></div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-lg p-4 shadow">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nessun task trovato
              </h3>
              <p className="text-gray-500">
                Prova a modificare i filtri per vedere altri task
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Task ({filteredTasks.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task, index) => (
                <div key={task.id} style={{ animationDelay: `${index * 30}ms` }} className="animate-fade-in">
                  <TaskCard
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    showProject={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects Overview */}
        {!loading && (
          <div className="mt-12 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Progetti ({projects.length})
            </h3>
            {projects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <p className="text-gray-500">Nessun progetto presente</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className="card hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                    {project.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                      <span className="text-gray-500">
                        {project.task_count || 0} task
                      </span>
                      <span className="text-green-600 font-medium">
                        {project.completed_count || 0} completati
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
