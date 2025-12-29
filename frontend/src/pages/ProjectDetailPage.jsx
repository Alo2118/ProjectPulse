import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Archive, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { projectsApi, tasksApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectModal from '../components/ProjectModal';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, tasksRes] = await Promise.all([
        projectsApi.getById(id),
        tasksApi.getAll({ project_id: id })
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error loading project:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archiviare il progetto "${project.name}"?`)) return;

    try {
      await projectsApi.update(id, { archived: true });
      navigate('/projects');
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante l\'archiviazione');
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
    completed: groupedTasks.completed.length,
    in_progress: groupedTasks.in_progress.length,
    blocked: groupedTasks.blocked.length,
    total_time: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-500">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="btn-secondary flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai Progetti
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Creato da {project.creator_name} il {new Date(project.created_at).toLocaleDateString('it-IT')}
              </p>
            </div>

            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setShowEditProject(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifica
              </button>
              <button
                onClick={handleArchive}
                className="btn-secondary flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                Archivia
              </button>
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuovo Task
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Task Totali</div>
          </div>

          <div className="card text-center bg-green-50 border-green-200">
            <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-green-600">Completati</div>
          </div>

          <div className="card text-center bg-blue-50 border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{stats.in_progress}</div>
            <div className="text-sm text-blue-600">In Corso</div>
          </div>

          <div className="card text-center bg-red-50 border-red-200">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <div className="text-3xl font-bold text-red-600">{stats.blocked}</div>
            <div className="text-sm text-red-600">Bloccati</div>
          </div>

          <div className="card text-center">
            <Clock className="w-6 h-6 text-gray-500 mx-auto mb-1" />
            <div className="text-3xl font-bold text-gray-900">
              {formatTime(stats.total_time)}
            </div>
            <div className="text-sm text-gray-500">Tempo Totale</div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Progresso Complessivo</h3>
              <span className="text-2xl font-bold text-primary-600">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-primary-600 h-4 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {stats.completed} di {stats.total} task completati
            </p>
          </div>
        )}

        {/* Tasks by Status */}
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nessun task in questo progetto</p>
            <button
              onClick={() => setShowCreateTask(true)}
              className="btn-primary"
            >
              Crea il primo task
            </button>
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
                      showProject={false}
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
                      showProject={false}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Waiting */}
            {groupedTasks.waiting_clarification.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  In Attesa ({groupedTasks.waiting_clarification.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedTasks.waiting_clarification.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showProject={false}
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
                      showProject={false}
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
                      showProject={false}
                    />
                  ))}
                </div>
                {groupedTasks.completed.length > 6 && (
                  <p className="text-center text-gray-500 mt-4">
                    ... e altri {groupedTasks.completed.length - 6} task completati
                  </p>
                )}
              </section>
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

      {showCreateTask && (
        <CreateTaskModal
          projects={[project]}
          onClose={() => setShowCreateTask(false)}
          onCreate={loadData}
        />
      )}

      {showEditProject && (
        <ProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSave={() => {
            setShowEditProject(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
