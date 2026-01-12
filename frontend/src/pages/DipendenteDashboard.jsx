import { useState, useEffect } from 'react';
import { Plus, FileText, AlertTriangle, Calendar, LayoutGrid, LayoutList, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tasksApi, projectsApi } from '../services/api';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import DailyReportModal from '../components/DailyReportModal';
import { Button, StatCard, StatCardGrid } from '../components/ui';
import KanbanBoard from '../components/common/KanbanBoard';
import TaskCalendar from '../components/common/TaskCalendar';
import TaskDistributionChart from '../components/charts/TaskDistributionChart';
import ProgressChart from '../components/charts/ProgressChart';

export default function DipendenteDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar, stats

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.getAll({ assigned_to: user.id }),
        projectsApi.getAll()
      ]);
      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(tasksData);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await tasksApi.update(taskId, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    waiting_clarification: tasks.filter(t => t.status === 'waiting_clarification'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  const stats = {
    total: tasks.length,
    in_progress: groupedTasks.in_progress.length,
    blocked: groupedTasks.blocked.length,
    waiting: groupedTasks.waiting_clarification.length,
    completed: groupedTasks.completed.length,
    totalTime: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate weekly stats
  const getWeeklyStats = () => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeekCompleted = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= oneWeekAgo;
    });

    const thisWeekTime = thisWeekCompleted.reduce((sum, t) => sum + (t.time_spent || 0), 0);
    const avgTimePerTask = thisWeekCompleted.length > 0
      ? thisWeekTime / thisWeekCompleted.length / 3600
      : 0;

    return {
      completed: thisWeekCompleted.length,
      totalTime: thisWeekTime,
      avgTimePerTask
    };
  };

  const weeklyStats = getWeeklyStats();

  // Prepare progress data for chart - last 7 days
  const getProgressData = () => {
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
  };

  const progressData = getProgressData();

  // Calculate alerts for deadlines
  const getAlerts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter(task => {
      if (!task.deadline || task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    });

    const dueSoonTasks = tasks.filter(task => {
      if (!task.deadline || task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 3;
    });

    return { overdueTasks, dueSoonTasks };
  };

  const { overdueTasks, dueSoonTasks } = getAlerts();

  const viewModes = [
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'list', label: 'Lista', icon: LayoutList },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'stats', label: 'Statistiche', icon: PieChart }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Le mie Attività
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Gestisci i tuoi task e monitora i tuoi progressi
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowReportModal(true)}>
                <FileText className="w-5 h-5" />
                Report Giornaliero
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                Nuova Attività
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <StatCardGrid columns={4} className="mb-6">
            <StatCard
              title="Totali"
              value={stats.total}
              variant="default"
            />
            <StatCard
              title="In Corso"
              value={stats.in_progress}
              variant="flat"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <StatCard
              title="Completati"
              value={stats.completed}
              variant="flat"
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <StatCard
              title="Tempo Totale"
              value={formatTime(stats.totalTime)}
              variant="flat"
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </StatCardGrid>

          {/* Weekly Stats */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 mb-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Statistiche Settimanali</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold">{weeklyStats.completed}</div>
                <div className="text-blue-100 text-sm">Task completati questa settimana</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{formatTime(weeklyStats.totalTime)}</div>
                <div className="text-blue-100 text-sm">Tempo investito questa settimana</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{weeklyStats.avgTimePerTask.toFixed(1)}h</div>
                <div className="text-blue-100 text-sm">Tempo medio per task</div>
              </div>
            </div>
          </div>

          {/* Alerts for deadlines */}
          {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
            <div className="mb-6 space-y-3">
              {overdueTasks.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800 mb-1">
                        {overdueTasks.length} attività in ritardo
                      </h4>
                      <div className="text-sm text-red-700 space-y-1">
                        {overdueTasks.slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center gap-2">
                            <span>•</span>
                            <button
                              onClick={() => setSelectedTask(task)}
                              className="hover:underline text-left"
                            >
                              {task.title}
                            </button>
                          </div>
                        ))}
                        {overdueTasks.length > 3 && (
                          <p className="text-xs text-red-600 italic">
                            ... e altre {overdueTasks.length - 3} attività
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {dueSoonTasks.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg animate-fade-in">
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-orange-800 mb-1">
                        {dueSoonTasks.length} attività in scadenza (prossimi 3 giorni)
                      </h4>
                      <div className="text-sm text-orange-700 space-y-1">
                        {dueSoonTasks.slice(0, 3).map(task => {
                          const deadline = new Date(task.deadline);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          deadline.setHours(0, 0, 0, 0);
                          const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={task.id} className="flex items-center gap-2">
                              <span>•</span>
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="hover:underline text-left"
                              >
                                {task.title}
                              </button>
                              <span className="text-xs">
                                ({diffDays === 0 ? 'oggi' : `${diffDays} gg`})
                              </span>
                            </div>
                          );
                        })}
                        {dueSoonTasks.length > 3 && (
                          <p className="text-xs text-orange-600 italic">
                            ... e altre {dueSoonTasks.length - 3} attività
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Timer onTimerChange={loadData} />
        </div>

        {/* View Mode Toggle */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-2">
          <div className="flex gap-2">
            {viewModes.map(mode => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === mode.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="animate-pulse bg-white rounded-lg p-8">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div className="animate-fade-in">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Vista Kanban ({tasks.length} task)
                </h3>
                <KanbanBoard
                  tasks={tasks}
                  onTaskClick={setSelectedTask}
                  onTaskUpdate={handleTaskUpdate}
                />
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-8 animate-fade-in">
                {/* In Progress */}
                {groupedTasks.in_progress.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full">
                        <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                        <h3 className="text-lg font-semibold text-blue-900">
                          In Corso ({groupedTasks.in_progress.length})
                        </h3>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTasks.in_progress.map((task, index) => (
                        <div key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                          <TaskCard task={task} onClick={() => setSelectedTask(task)} onTimerStart={loadData} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Blocked */}
                {groupedTasks.blocked.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-full">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                        <h3 className="text-lg font-semibold text-red-900">
                          Bloccati ({groupedTasks.blocked.length})
                        </h3>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTasks.blocked.map((task, index) => (
                        <div key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                          <TaskCard task={task} onClick={() => setSelectedTask(task)} onTimerStart={loadData} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Waiting Clarification */}
                {groupedTasks.waiting_clarification.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
                        <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                        <h3 className="text-lg font-semibold text-yellow-900">
                          In Attesa di Chiarimenti ({groupedTasks.waiting_clarification.length})
                        </h3>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTasks.waiting_clarification.map((task, index) => (
                        <div key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                          <TaskCard task={task} onClick={() => setSelectedTask(task)} onTimerStart={loadData} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Todo */}
                {groupedTasks.todo.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                        <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Da Fare ({groupedTasks.todo.length})
                        </h3>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTasks.todo.map((task, index) => (
                        <div key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                          <TaskCard task={task} onClick={() => setSelectedTask(task)} onTimerStart={loadData} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Completed */}
                {groupedTasks.completed.length > 0 && (
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        <h3 className="text-lg font-semibold text-green-900">
                          Completati ({groupedTasks.completed.length})
                        </h3>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTasks.completed.slice(0, 6).map((task, index) => (
                        <div key={task.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
                          <TaskCard task={task} onClick={() => setSelectedTask(task)} onTimerStart={loadData} />
                        </div>
                      ))}
                    </div>
                    {groupedTasks.completed.length > 6 && (
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500">
                          Mostrati 6 di {groupedTasks.completed.length} task completati
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {tasks.length === 0 && (
                  <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                      <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Plus className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Nessuna attività presente
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Inizia creando la tua prima attività
                      </p>
                      <Button onClick={() => setShowCreateModal(true)}>
                        Crea la prima attività
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <div className="animate-fade-in">
                <TaskCalendar
                  tasks={tasks}
                  onDateClick={(date, tasksOnDate) => {
                    if (tasksOnDate.length === 1) {
                      setSelectedTask(tasksOnDate[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Stats View */}
            {viewMode === 'stats' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TaskDistributionChart tasks={tasks} />
                  <ProgressChart progressData={progressData} title="Il mio Progresso (Ultimi 7 Giorni)" />
                </div>

                {/* Projects Breakdown */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Task per Progetto
                  </h3>
                  <div className="space-y-4">
                    {projects.map(project => {
                      const projectTasks = tasks.filter(t => t.project_id === project.id);
                      const completedTasks = projectTasks.filter(t => t.status === 'completed');
                      const completionRate = projectTasks.length > 0
                        ? (completedTasks.length / projectTasks.length) * 100
                        : 0;

                      if (projectTasks.length === 0) return null;

                      return (
                        <div key={project.id} className="border-b border-gray-100 pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{project.name}</h4>
                            <span className="text-sm text-gray-500">
                              {completedTasks.length}/{projectTasks.length} completati
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{completionRate.toFixed(0)}% completato</span>
                            <span>
                              {formatTime(projectTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadData}
        />
      )}

      {showCreateModal && (
        <CreateTaskModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={loadData}
        />
      )}

      {showReportModal && (
        <DailyReportModal
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
