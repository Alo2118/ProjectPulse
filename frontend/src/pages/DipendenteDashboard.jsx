import { useState, useEffect } from 'react';
import { Plus, FileText, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tasksApi, projectsApi } from '../services/api';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import DailyReportModal from '../components/DailyReportModal';
import { Button, StatCard, StatCardGrid } from '../components/ui';

export default function DipendenteDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);

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
      // Handle paginated response from tasks API
      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(tasksData);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Le mie Attività R&D
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Sviluppo dispositivi ortopedici e strumenti chirurgici
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

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="bg-white rounded-lg p-4 shadow">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* In Progress */}
            {groupedTasks.in_progress.length > 0 && (
              <section className="animate-slide-up">
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
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onTimerStart={loadData}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Blocked */}
            {groupedTasks.blocked.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
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
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onTimerStart={loadData}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Waiting Clarification */}
            {groupedTasks.waiting_clarification.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
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
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onTimerStart={loadData}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Todo */}
            {groupedTasks.todo.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '300ms' }}>
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
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onTimerStart={loadData}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {groupedTasks.completed.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
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
                      <TaskCard
                        task={task}
                        onClick={() => setSelectedTask(task)}
                        onTimerStart={loadData}
                      />
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
              <div className="text-center py-16 animate-fade-in">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Nessuna attività presente
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Inizia creando la tua prima attività di sviluppo, testing o documentazione
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Crea la prima attività
                  </Button>
                </div>
              </div>
            )}
          </div>
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
