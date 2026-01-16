import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { projectsApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canCreate } from '../utils/permissions';
import CreateProjectModal from '../components/CreateProjectModal';
import ProjectModal from '../components/ProjectModal';
import { formatTime } from '../utils/helpers';
import { GamingLayout, GamingHeader, GamingCard, GamingLoader, GamingKPICard, GamingKPIGrid, Button } from '../components/ui';

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
    <GamingLayout>
      <GamingHeader
        title="Progetti R&D"
        subtitle="Dispositivi ortopedici, protesi e strumenti chirurgici"
        icon={Briefcase}
        actions={
          <Button
            onClick={handleCreate}
            disabled={!canCreate(user, 'project')}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xl shadow-primary-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Progetto</span>
            <span className="inline sm:hidden">Nuovo</span>
          </Button>
        }
      />

      {/* Stats */}
      <GamingKPIGrid columns={4} className="mb-6">
        <GamingKPICard 
          title="Progetti" 
          value={projects.length} 
          icon={FolderOpen} 
          gradient="from-blue-600 to-cyan-700" 
          shadowColor="blue" 
        />
        <GamingKPICard 
          title="Completati" 
          value={Object.values(projectStats).reduce((sum, s) => sum + s.completed, 0)} 
          icon={CheckCircle} 
          gradient="from-emerald-600 to-green-700" 
          shadowColor="emerald" 
        />
        <GamingKPICard 
          title="In Corso" 
          value={Object.values(projectStats).reduce((sum, s) => sum + s.in_progress, 0)} 
          icon={Clock} 
          gradient="from-purple-600 to-pink-700" 
          shadowColor="purple" 
        />
        <GamingKPICard 
          title="Bloccati" 
          value={Object.values(projectStats).reduce((sum, s) => sum + s.blocked, 0)} 
          icon={AlertCircle} 
          gradient="from-red-600 to-rose-700" 
          shadowColor="red" 
        />
      </GamingKPIGrid>

      {/* Projects Grid */}
      {loading ? (
        <GamingLoader message="Caricamento progetti..." />
      ) : projects.length === 0 ? (
        <GamingCard className="text-center py-12">
          <div className="text-6xl mb-4">🔬</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Nessun progetto R&D</h3>
          <p className="text-slate-600 mb-6">
            Inizia creando un progetto per lo sviluppo di dispositivi medici
          </p>
          <button 
            onClick={handleCreate} 
            disabled={!canCreate(user, 'project')}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold shadow-xl shadow-primary-600/50 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crea il primo progetto
          </button>
        </GamingCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => {
            const stats = projectStats[project.id] || {};
            const completionRate = getCompletionRate(project.id);

            return (
              <GamingCard
                key={project.id}
                className="cursor-pointer group hover:border-primary-500/50 transition-all duration-300"
                onClick={(e) => {
                  console.log('Card clicked!', project.id);
                  navigate(`/projects/${project.id}`);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <span>📐</span>
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {stats.total > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-primary-600 font-bold">Progresso</span>
                      <span className="font-bold text-slate-900">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner border-2 border-primary-300">
                      <div
                        className="bg-gradient-to-r from-primary-600 to-primary-500 h-4 rounded-full transition-all duration-1000 relative shadow-sm"
                        style={{ width: `${completionRate}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-slate-200">
                    <div className="text-xl mb-1">📊</div>
                    <div className="text-xl font-bold text-slate-900">
                      {stats.total || 0}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold">Tot</div>
                  </div>

                  <div className="text-center p-3 bg-white rounded-lg border-2 border-emerald-200">
                    <div className="text-xl mb-1">✅</div>
                    <div className="text-xl font-bold text-emerald-700">
                      {stats.completed || 0}
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold">OK</div>
                  </div>

                  <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
                    <div className="text-xl mb-1">🚀</div>
                    <div className="text-xl font-bold text-blue-700">
                      {stats.in_progress || 0}
                    </div>
                    <div className="text-xs text-blue-600 font-semibold">WIP</div>
                  </div>

                  <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
                    <div className="text-xl mb-1">🚫</div>
                    <div className="text-xl font-bold text-red-700">
                      {stats.blocked || 0}
                    </div>
                    <div className="text-xs text-red-600 font-semibold">Block</div>
                  </div>
                </div>

                {/* Time Badge */}
                {stats.total_time > 0 && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 mb-4 shadow-sm">
                    <span className="text-lg">⏱️</span>
                    <span className="text-sm font-bold text-blue-700">{formatTime(stats.total_time)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(project);
                    }}
                    className="flex-1 px-4 py-2 bg-white border-2 border-primary-300 hover:bg-primary-50 hover:border-primary-400 text-primary-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(project);
                    }}
                    className="px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                  >
                    Archivia
                  </button>
                </div>
              </GamingCard>
            );
          })}
        </div>
      )}

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
    </GamingLayout>
  );
}
