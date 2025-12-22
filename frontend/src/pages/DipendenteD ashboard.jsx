import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tasksApi, projectsApi } from '../services/api';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import DailyReportModal from '../components/DailyReportModal';

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
      setTasks(tasksRes.data);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            I miei Task
          </h2>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuovo Task
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Report Giornaliero
            </button>
          </div>

          <Timer onTimerChange={loadData} />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Caricamento...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* In Progress */}
            {groupedTasks.in_progress.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  In Corso ({groupedTasks.in_progress.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.in_progress.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Blocked */}
            {groupedTasks.blocked.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Bloccati ({groupedTasks.blocked.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.blocked.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Waiting Clarification */}
            {groupedTasks.waiting_clarification.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  In Attesa di Chiarimenti ({groupedTasks.waiting_clarification.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.waiting_clarification.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Todo */}
            {groupedTasks.todo.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                  Da Fare ({groupedTasks.todo.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.todo.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {groupedTasks.completed.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Completati ({groupedTasks.completed.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.completed.slice(0, 6).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                    />
                  ))}
                </div>
              </section>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Nessun task presente</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  Crea il tuo primo task
                </button>
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
