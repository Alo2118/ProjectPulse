import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { projectsApi, tasksApi } from '../services/api';
import Navbar from '../components/Navbar';
import ProjectModal from '../components/ProjectModal';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll()
      ]);

      const projects = projectsRes.data;
      // Handle paginated response from tasks API
      const tasks = tasksRes.data.data || tasksRes.data;

      // Calculate stats for each project
      const stats = {};
      projects.forEach(project => {
        const projectTasks = tasks.filter(t => t.project_id === project.id);
        stats[project.id] = {
          total: projectTasks.length,
          completed: projectTasks.filter(t => t.status === 'completed').length,
          in_progress: projectTasks.filter(t => t.status === 'in_progress').length,
          blocked: projectTasks.filter(t => t.status === 'blocked').length,
          total_time: projectTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
        };
      });

      setProjects(projects);
      setProjectStats(stats);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setShowModal(true);
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleArchive = async (project) => {
    if (!confirm(`Archiviare il progetto "${project.name}"?`)) return;

    try {
      await projectsApi.update(project.id, { archived: true });
      loadProjects();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante l\'archiviazione');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getCompletionRate = (projectId) => {
    const stats = projectStats[projectId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Progetti R&D</h1>
            <p className="text-gray-600 mt-0.5 text-sm">
              Sviluppo dispositivi ortopedici, protesi e strumenti chirurgici
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuovo Progetto
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="card bg-blue-50 border-blue-200">
            <FolderOpen className="w-6 h-6 text-blue-600 mb-1" />
            <div className="text-xl font-bold text-blue-900">{projects.length}</div>
            <div className="text-xs text-blue-600">Progetti Attivi</div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <CheckCircle className="w-6 h-6 text-green-600 mb-1" />
            <div className="text-xl font-bold text-green-900">
              {Object.values(projectStats).reduce((sum, s) => sum + s.completed, 0)}
            </div>
            <div className="text-xs text-green-600">Task Completati</div>
          </div>

          <div className="card bg-yellow-50 border-yellow-200">
            <Clock className="w-6 h-6 text-yellow-600 mb-1" />
            <div className="text-xl font-bold text-yellow-900">
              {Object.values(projectStats).reduce((sum, s) => sum + s.in_progress, 0)}
            </div>
            <div className="text-xs text-yellow-600">In Corso</div>
          </div>

          <div className="card bg-red-50 border-red-200">
            <AlertCircle className="w-6 h-6 text-red-600 mb-1" />
            <div className="text-xl font-bold text-red-900">
              {Object.values(projectStats).reduce((sum, s) => sum + s.blocked, 0)}
            </div>
            <div className="text-xs text-red-600">Bloccati</div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Caricamento...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun progetto R&D</h3>
            <p className="text-gray-500 mb-4">
              Inizia creando un progetto per lo sviluppo di dispositivi medici o strumentario
            </p>
            <button onClick={handleCreate} className="btn-primary hover:scale-105 transition-transform shadow-lg">
              Crea il primo progetto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => {
              const stats = projectStats[project.id] || {};
              const completionRate = getCompletionRate(project.id);

              return (
                <div
                  key={project.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-gray-900 group-hover:text-primary-600 transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {stats.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-medium text-gray-900">{completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <div className="text-xl font-bold text-gray-900">
                        {stats.total || 0}
                      </div>
                      <div className="text-xs text-gray-500">Task Totali</div>
                    </div>

                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {stats.completed || 0}
                      </div>
                      <div className="text-xs text-gray-500">Completati</div>
                    </div>

                    {stats.total_time > 0 && (
                      <div className="col-span-2 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTime(stats.total_time)} di lavoro</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(project);
                      }}
                      className="btn-secondary text-sm flex-1"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(project);
                      }}
                      className="btn-secondary text-sm"
                    >
                      Archivia
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showModal && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setShowModal(false)}
          onSave={loadProjects}
        />
      )}
    </div>
  );
}
