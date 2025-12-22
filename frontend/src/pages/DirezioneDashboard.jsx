import { useState, useEffect } from 'react';
import { Briefcase, Clock, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Dashboard Direzione
          </h2>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="card text-center">
              <Briefcase className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Task Totali</div>
            </div>

            <div className="card text-center bg-blue-50 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
              <div className="text-sm text-blue-600">In Corso</div>
            </div>

            <div className="card text-center bg-red-50 border-red-200">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
              <div className="text-sm text-red-600">Bloccati</div>
            </div>

            <div className="card text-center bg-yellow-50 border-yellow-200">
              <HelpCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
              <div className="text-sm text-yellow-600">In Attesa</div>
            </div>

            <div className="card text-center bg-green-50 border-green-200">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-green-600">Completati</div>
            </div>

            <div className="card text-center">
              <Clock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTime)}</div>
              <div className="text-sm text-gray-500">Tempo Totale</div>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
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
          <div className="text-center py-12">
            <div className="text-gray-500">Caricamento...</div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nessun task trovato con i filtri selezionati</p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Task ({filteredTasks.length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  showProject={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Projects Overview */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Progetti ({projects.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <div key={project.id} className="card">
                <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {project.task_count || 0} task
                  </span>
                  <span className="text-green-600">
                    {project.completed_count || 0} completati
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
