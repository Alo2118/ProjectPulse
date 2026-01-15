import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { projectsApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canCreate } from '../utils/permissions';
import CreateProjectModal from '../components/CreateProjectModal';
import ProjectModal from '../components/ProjectModal';
import { formatTime } from '../utils/helpers';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

      setProjects(projectsRes.data);
      // Handle paginated response from tasks API
      setTasks(tasksRes.data.data || tasksRes.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize project stats calculation
  const projectStats = useMemo(() => {
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
    return stats;
  }, [projects, tasks]);

  const handleCreate = () => {
    setShowCreateModal(true);
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setShowEditModal(true);
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

  const getCompletionRate = (projectId) => {
    const stats = projectStats[projectId];
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        {/* Header Compatto */}
        <div className="flex items-center justify-between mb-4 animate-slide-right">
          <div>
            <h1 className="page-title flex items-center gap-2">
              🔬 Progetti R&D
            </h1>
            <p className="text-slate-600 mt-0.5 text-xs">
              Dispositivi ortopedici, protesi e strumenti chirurgici
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={!canCreate(user, 'project')}
            className="btn-primary flex items-center gap-1.5 text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed hover-scale"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Progetto</span>
            <span className="inline sm:hidden">Nuovo</span>
          </button>
        </div>

        {/* Stats Compatti con Emoji */}
        <div className="stats-grid-compact stagger-animation">
          <div className="card-stat from-primary-50 to-primary-100 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-700 mb-1">📁 Progetti</div>
                <div className="text-2xl font-bold text-blue-900">{projects.length}</div>
              </div>
              <div className="text-3xl">🗂️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-3 border border-primary-200 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-primary-700 mb-1">✓ Completati</div>
                <div className="text-2xl font-bold text-primary-900">
                  {Object.values(projectStats).reduce((sum, s) => sum + s.completed, 0)}
                </div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg p-3 border border-primary-300 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-primary-800 mb-1">⚡ In Corso</div>
                <div className="text-2xl font-bold text-primary-900">
                  {Object.values(projectStats).reduce((sum, s) => sum + s.in_progress, 0)}
                </div>
              </div>
              <div className="text-3xl">🚀</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-700 mb-1">🚫 Bloccati</div>
                <div className="text-2xl font-bold text-red-900">
                  {Object.values(projectStats).reduce((sum, s) => sum + s.blocked, 0)}
                </div>
              </div>
              <div className="text-3xl">⛔</div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-3 text-sm">Caricamento...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-6xl mb-4">🔬</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Nessun progetto R&D</h3>
            <p className="text-slate-500 mb-4 text-sm">
              Inizia creando un progetto per lo sviluppo di dispositivi medici
            </p>
            <button 
              onClick={handleCreate} 
              disabled={!canCreate(user, 'project')}
              className="btn-primary hover-scale shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Crea il primo progetto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-animation">
            {projects.map(project => {
              const stats = projectStats[project.id] || {};
              const completionRate = getCompletionRate(project.id);

              return (
                <div
                  key={project.id}
                  className="card hover-lift cursor-pointer group transition-all"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-slate-900 group-hover:text-teal-600 transition-colors flex items-center gap-2">
                        <span>📐</span>
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Compatto */}
                  {stats.total > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Progresso</span>
                        <span className="font-semibold text-slate-900">{completionRate}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-primary-600 to-primary-700 h-1.5 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats Compatti */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                    <div className="text-center">
                      <div className="text-sm">📊</div>
                      <div className="text-lg font-bold text-slate-900">
                        {stats.total || 0}
                      </div>
                      <div className="text-xs text-slate-500">Tot</div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm">✅</div>
                      <div className="text-lg font-bold text-primary-700">
                        {stats.completed || 0}
                      </div>
                      <div className="text-xs text-slate-500">OK</div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm">🚀</div>
                      <div className="text-lg font-bold text-primary-600">
                        {stats.in_progress || 0}
                      </div>
                      <div className="text-xs text-slate-500">WIP</div>
                    </div>

                    <div className="text-center">
                      <div className="text-sm">🚫</div>
                      <div className="text-lg font-bold text-slate-700">
                        {stats.blocked || 0}
                      </div>
                      <div className="text-xs text-slate-500">Block</div>
                    </div>

                    {stats.total_time > 0 && (
                      <div className="col-span-4 mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
                          <span>⏱️</span>
                          <span className="font-medium">{formatTime(stats.total_time)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={loadProjects}
        />
      )}

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setShowEditModal(false)}
          onSave={loadProjects}
        />
      )}
    </div>
  );
}
