import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { projectsApi, tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canCreate } from '../utils/permissions';
import { designTokens } from '../config/designTokens';
import CreateProjectModal from '../components/CreateProjectModal';
import ProjectModal from '../components/ProjectModal';
import { formatTime } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import theme, { cn } from '../styles/theme';
import {
  GamingLayout,
  GamingHeader,
  GamingCard,
  GamingLoader,
  GamingKPICard,
  GamingKPIGrid,
  Button,
} from '../components/ui';

export default function ProjectsPage() {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: showError } = useToast();
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
      const [projectsRes, tasksRes] = await Promise.all([projectsApi.getAll(), tasksApi.getAll()]);

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
    projects.forEach((project) => {
      const projectTasks = tasks.filter((t) => t.project_id === project.id);
      stats[project.id] = {
        total: projectTasks.length,
        completed: projectTasks.filter((t) => t.status === 'completed').length,
        in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
        blocked: projectTasks.filter((t) => t.status === 'blocked').length,
        total_time: projectTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0),
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
      showError(error.response?.data?.error || "Errore durante l'archiviazione");
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
          <Button onClick={handleCreate} disabled={!canCreate(user, 'project')} variant="primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuovo Progetto</span>
            <span className="inline sm:hidden">Nuovo</span>
          </Button>
        }
      />

      {/* Stats */}
      <GamingKPIGrid columns={4} className={theme.spacing.mb.lg}>
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
        <GamingCard className={cn(theme.spacing.py.xl, 'text-center')}>
          <div className={cn(theme.spacing.mb.md, 'text-6xl')}>🔬</div>
          <h3 className={cn(theme.spacing.mb.sm, 'text-xl font-bold', colors.text.primary)}>
            Nessun progetto R&D
          </h3>
          <p className={cn(theme.spacing.mb.lg, colors.text.tertiary)}>
            Inizia creando un progetto per lo sviluppo di dispositivi medici
          </p>
          <Button
            onClick={handleCreate}
            disabled={!canCreate(user, 'project')}
            variant="primary"
            size="lg"
          >
            Crea il primo progetto
          </Button>
        </GamingCard>
      ) : (
        <div className={theme.layout.grid.cols3}>
          {projects.map((project) => {
            const stats = projectStats[project.id] || {};
            const completionRate = getCompletionRate(project.id);

            return (
              <GamingCard
                key={project.id}
                className={cn(
                  'group cursor-pointer',
                  theme.utils.transition.default,
                  'hover:border-cyan-400 dark:hover:border-cyan-500/50'
                )}
                onClick={(e) => {
                  console.log('Card clicked!', project.id);
                  navigate(`/projects/${project.id}`);
                }}
              >
                <div className={cn(theme.spacing.mb.md, theme.layout.flex.between, 'items-start')}>
                  <div className="flex-1">
                    <h3 className={cn(
                      theme.spacing.mb.sm,
                      'flex items-center',
                      theme.spacing.gap.sm,
                      'text-xl font-bold',
                      colors.text.primary
                    )}>
                      <span>📐</span>
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className={cn(theme.utils.lineClamp[2], 'text-sm', colors.text.secondary)}>
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {stats.total > 0 && (
                  <div className={theme.spacing.mb.md}>
                    <div className={cn(
                      theme.spacing.mb.sm,
                      theme.layout.flex.between,
                      'text-sm'
                    )}>
                      <span className={cn('font-bold', designTokens.colors.cyan.text)}>Progresso</span>
                      <span className={cn('font-bold', colors.text.primary)}>{completionRate}%</span>
                    </div>
                    <div className={cn(
                      'h-4 w-full overflow-hidden rounded-full border',
                      designTokens.colors.cyan.borderLight,
                      colors.bg.secondary,
                      'shadow-inner'
                    )}>
                      <div
                        className={cn(
                          'relative h-4 rounded-full',
                          'bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-500',
                          'shadow-cyan-500/40',
                          theme.utils.transition.slow
                        )}
                        style={{ width: `${completionRate}%` }}
                      >
                        <div className={cn(
                          'absolute inset-0',
                          theme.animation.pulse,
                          designTokens.colors.cyan.bg,
                          'opacity-10'
                        )}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className={cn(theme.spacing.mb.md, 'grid grid-cols-4 gap-3')}>
                  <div className={cn(
                    'rounded-lg border',
                    designTokens.colors.cyan.borderLight,
                    colors.bg.secondary,
                    theme.spacing.p.sm,
                    'text-center'
                  )}>
                    <div className={cn(theme.spacing.mb.xs, 'text-xl')}>📊</div>
                    <div className={cn('text-xl font-bold', colors.text.primary)}>{stats.total || 0}</div>
                    <div className={cn('text-xs font-semibold', colors.text.secondary)}>Tot</div>
                  </div>

                  <div className={cn(
                    'rounded-lg border',
                    designTokens.colors.success.border,
                    colors.bg.secondary,
                    theme.spacing.p.sm,
                    'text-center'
                  )}>
                    <div className={cn(theme.spacing.mb.xs, 'text-xl')}>✅</div>
                    <div className={cn('text-xl font-bold', designTokens.colors.success.text)}>
                      {stats.completed || 0}
                    </div>
                    <div className={cn('text-xs font-semibold', designTokens.colors.success.textLight)}>OK</div>
                  </div>

                  <div className={cn(
                    'rounded-lg border',
                    designTokens.colors.info.border,
                    colors.bg.secondary,
                    theme.spacing.p.sm,
                    'text-center'
                  )}>
                    <div className={cn(theme.spacing.mb.xs, 'text-xl')}>🚀</div>
                    <div className={cn('text-xl font-bold', designTokens.colors.info.text)}>
                      {stats.in_progress || 0}
                    </div>
                    <div className={cn('text-xs font-semibold', designTokens.colors.info.textLight)}>WIP</div>
                  </div>

                  <div className={cn(
                    'rounded-lg border',
                    designTokens.colors.error.border,
                    colors.bg.secondary,
                    theme.spacing.p.sm,
                    'text-center'
                  )}>
                    <div className={cn(theme.spacing.mb.xs, 'text-xl')}>🚫</div>
                    <div className={cn('text-xl font-bold', designTokens.colors.error.text)}>
                      {stats.blocked || 0}
                    </div>
                    <div className={cn('text-xs font-semibold', designTokens.colors.error.textLight)}>Block</div>
                  </div>
                </div>

                {/* Time Badge */}
                {stats.total_time > 0 && (
                  <div className={cn(
                    theme.spacing.mb.md,
                    theme.layout.flex.center,
                    theme.spacing.gap.sm,
                    'rounded-lg border',
                    designTokens.colors.cyan.borderLight,
                    colors.bg.secondary,
                    theme.spacing.px.md,
                    theme.spacing.py.sm,
                    theme.effects.shadow.sm
                  )}>
                    <span className="text-lg">⏱️</span>
                    <span className={cn('text-sm font-bold', designTokens.colors.cyan.textBright)}>
                      {formatTime(stats.total_time)}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className={cn(
                  'flex',
                  theme.spacing.gap.sm,
                  'border-t',
                  designTokens.colors.cyan.borderLight,
                  theme.spacing.pt.md
                )}>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(project);
                    }}
                  >
                    Modifica
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(project);
                    }}
                  >
                    Archivia
                  </Button>
                </div>
              </GamingCard>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal onClose={() => setShowCreateModal(false)} onCreate={loadProjects} />
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
