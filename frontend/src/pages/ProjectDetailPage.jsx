import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import theme, { cn } from '../styles/theme';
import {
  ArrowLeft,
  Plus,
  Edit,
  Archive,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Calendar,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import TaskTreeList from '../components/TaskTreeList';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectModal from '../components/ProjectModal';
import MilestoneModal from '../components/MilestoneModal';
import { formatTime } from '../utils/helpers';
import {
  GamingLayout,
  GamingHeader,
  GamingCard,
  GamingLoader,
  GamingKPICard,
  GamingKPIGrid,
  Button,
} from '../components/ui';

export default function ProjectDetailPage() {
  const { error: showError } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [defaultMilestoneForTask, setDefaultMilestoneForTask] = useState(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [showUnassignedTasks, setShowUnassignedTasks] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, tasksRes, milestonesRes] = await Promise.all([
        projectsApi.getById(id),
        tasksApi.getAll({ project_id: id }),
        milestonesApi.getByProject(id),
      ]);
      setProject(projectRes.data);
      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(tasksData);
      setMilestones(milestonesRes.data);
    } catch (error) {
      console.error('Error loading project:', error);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneComplete = async (milestoneId) => {
    try {
      await milestonesApi.complete(milestoneId);
      loadData();
    } catch (error) {
      showError(error.response?.data?.error || 'Errore durante il completamento');
    }
  };

  const handleMilestoneDelete = async (milestoneId) => {
    if (!confirm('Eliminare questa milestone?')) return;
    try {
      await milestonesApi.delete(milestoneId);
      loadData();
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'eliminazione");
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archiviare il progetto "${project.name}"?`)) return;

    try {
      await projectsApi.update(id, { archived: true });
      navigate('/projects');
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'archiviazione");
    }
  };

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  const getTasksForMilestone = useCallback(
    (milestoneId) => {
      return tasks.filter((t) => t.milestone_id === milestoneId);
    },
    [tasks]
  );

  const unassignedTasks = useMemo(() => {
    return tasks.filter((t) => !t.milestone_id && !t.parent_task_id);
  }, [tasks]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      total_time: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0),
    }),
    [tasks]
  );

  const completionRate = useMemo(
    () => (stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0),
    [stats]
  );

  if (loading) {
    return <GamingLoader message="Caricamento progetto..." />;
  }

  if (!project) return null;

  return (
    <GamingLayout>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/projects')}
        className={cn(theme.spacing.mb4, theme.border.default, theme.text.primary, 'hover:text-white')}
      >
        <ArrowLeft className={theme.icon.sm} />
        Torna ai Progetti
      </Button>

      <GamingHeader
        title={project.name}
        subtitle={project.description || `Creato da ${project.creator_name}`}
        icon={Target}
        actions={
          <div className={cn(theme.layout.flexRow, theme.spacing.gap2)}>
            <Button variant="secondary" size="sm" onClick={() => setShowEditProject(true)}>
              <Edit className={theme.icon.sm} />
              Modifica
            </Button>
            <Button variant="danger" size="sm" onClick={handleArchive}>
              <Archive className={theme.icon.sm} />
              Archivia
            </Button>
            <Button size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className={theme.icon.sm} />
              Nuovo Task
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <GamingKPIGrid columns={5} className={theme.spacing.mb6}>
        <GamingKPICard
          title="Task Totali"
          value={stats.total}
          icon={Target}
          gradient="from-slate-600 to-slate-700"
          shadowColor="slate"
        />
        <GamingKPICard
          title="Completati"
          value={stats.completed}
          icon={CheckCircle}
          gradient="from-emerald-600 to-green-700"
          shadowColor="emerald"
        />
        <GamingKPICard
          title="In Corso"
          value={stats.in_progress}
          icon={Zap}
          gradient="from-blue-600 to-cyan-700"
          shadowColor="blue"
        />
        <GamingKPICard
          title="Bloccati"
          value={stats.blocked}
          icon={AlertCircle}
          gradient="from-red-600 to-rose-700"
          shadowColor="red"
        />
        <GamingKPICard
          title="Tempo Totale"
          value={formatTime(stats.total_time)}
          icon={Clock}
          gradient="from-orange-600 to-amber-700"
          shadowColor="orange"
        />
      </GamingKPIGrid>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <GamingCard className={cn(theme.spacing.mb6, theme.border.default, theme.bg.secondary)}>
          <div className={cn(theme.spacing.mb4, theme.layout.flexRow, theme.layout.itemsCenter, theme.layout.justifyBetween)}>
            <h3 className={cn(theme.text.lg, theme.font.semibold, theme.text.white)}>Progresso Complessivo</h3>
            <span className={cn(theme.text.heading, theme.font.bold, theme.colors.accent)}>{completionRate}%</span>
          </div>
          <div className={cn(theme.spacing.mb2, 'h-3 w-full overflow-hidden rounded-full', theme.border.default, theme.bg.tertiary)}>
            <div
              className="relative h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            >
              <div className="absolute inset-0 animate-pulse bg-white/10" />
            </div>
          </div>
          <p className={cn(theme.text.sm, theme.font.semibold, theme.text.primary)}>
            {stats.completed} di {stats.total} task completati
          </p>
        </GamingCard>
      )}

      {/* Milestones and Tasks */}
      <div className={theme.spacing.mb6}>
        <div className={cn(theme.spacing.mb6, theme.layout.flexRow, theme.layout.itemsCenter, theme.layout.justifyBetween)}>
          <h3 className={cn(theme.layout.flexRow, theme.layout.itemsCenter, theme.spacing.gap3, theme.text.heading, theme.font.bold, theme.text.white)}>
            <Target className={cn('h-7 w-7', theme.colors.accent)} />
            Milestone e Attività
          </h3>
          <div className={cn(theme.layout.flexRow, theme.spacing.gap3)}>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className={theme.icon.sm} />
              Nuova Attività
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedMilestone(null);
                setShowMilestoneModal(true);
              }}
            >
              <Plus className={theme.icon.sm} />
              Nuova Milestone
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <GamingCard className="py-12 text-center">
            <Target className={cn('mx-auto', theme.spacing.mb4, 'h-16 w-16', theme.text.muted)} />
            <p className={cn(theme.spacing.mb6, theme.text.secondary)}>Nessun task in questo progetto</p>
            <Button onClick={() => setShowCreateTask(true)}>Crea il primo task</Button>
          </GamingCard>
        ) : (
          <div className={theme.spacing.gap4}>
            {/* Milestone Accordion Items */}
            {milestones.map((milestone) => {
              const milestoneTasks = getTasksForMilestone(milestone.id);
              const isExpanded = expandedMilestones.has(milestone.id);
              const milestoneProgress =
                milestoneTasks.length > 0
                  ? Math.round(
                      (milestoneTasks.filter((t) => t.status === 'completed').length /
                        milestoneTasks.length) *
                        100
                    )
                  : 0;
              const isCompleted = milestone.status === 'completed';
              const isCancelled = milestone.status === 'cancelled';
              const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

              return (
                <GamingCard
                  key={milestone.id}
                  className={cn(
                    theme.bg.secondary,
                    isCompleted && cn('border', theme.border.success),
                    isCancelled && 'opacity-70',
                    isOverdue && cn('border', theme.border.error)
                  )}
                >
                  {/* Milestone Header */}
                  <div
                    className={cn(
                      '-m-6',
                      theme.layout.flexRow,
                      theme.layout.itemsCenter,
                      theme.spacing.gap3,
                      'rounded-xl',
                      theme.spacing.p6,
                      'cursor-pointer transition-colors',
                      theme.bg.hover
                    )}
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <button className={cn(theme.text.tertiary, 'hover:' + theme.colors.accent)}>
                      {isExpanded ? (
                        <ChevronDown className={theme.icon.base} />
                      ) : (
                        <ChevronRight className={theme.icon.base} />
                      )}
                    </button>

                    <div className={theme.layout.flex1}>
                      <div className={cn(theme.spacing.mb1, theme.layout.flexRow, theme.layout.itemsCenter, theme.spacing.gap2)}>
                        <h4 className={cn(theme.text.lg, theme.font.bold, theme.text.white)}>{milestone.name}</h4>
                        {isCompleted && <CheckCircle className={cn(theme.icon.sm, theme.colors.success)} />}
                        <span className={cn(theme.text.sm, theme.text.tertiary)}>
                          ({milestoneTasks.length} task)
                        </span>
                      </div>

                      {milestone.description && !isExpanded && (
                        <p className={cn('line-clamp-1', theme.text.sm, theme.text.secondary)}>
                          {milestone.description}
                        </p>
                      )}

                      <div className={cn(theme.spacing.mt2, theme.layout.flexRow, theme.layout.itemsCenter, theme.spacing.gap4)}>
                        {/* Progress */}
                        <div className={cn(theme.layout.flexRow, theme.layout.itemsCenter, theme.spacing.gap2)}>
                          <div className={cn('h-2.5 w-32 overflow-hidden rounded-full', theme.border.default, theme.bg.tertiary, 'shadow-inner')}>
                            <div
                              className={cn(
                                'h-full rounded-full shadow-sm transition-all',
                                isCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                              )}
                              style={{ width: `${milestoneProgress}%` }}
                            />
                          </div>
                          <span className={cn(theme.text.xs, theme.font.bold, theme.text.primary)}>
                            {milestoneProgress}%
                          </span>
                        </div>

                        {/* Due Date */}
                        {dueDate && (
                          <div
                            className={cn(
                              theme.layout.flexRow,
                              theme.layout.itemsCenter,
                              'gap-1',
                              theme.text.xs,
                              theme.font.semibold,
                              isOverdue ? theme.colors.error : theme.text.secondary
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {dueDate.toLocaleDateString('it-IT')}
                            {isOverdue && ' (In ritardo)'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={cn(theme.layout.flexRow, theme.spacing.gap2)} onClick={(e) => e.stopPropagation()}>
                      {!isCompleted && !isCancelled && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setShowMilestoneModal(true);
                            }}
                            className={cn('px-3 py-1', theme.text.xs)}
                            title="Modifica milestone"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleMilestoneComplete(milestone.id)}
                            className={cn('px-3 py-1', theme.text.xs)}
                            title="Completa milestone"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(isCompleted || isCancelled) && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleMilestoneDelete(milestone.id)}
                          className={cn('px-3 py-1', theme.text.xs)}
                          title="Elimina milestone"
                        >
                          Elimina
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {isExpanded && (
                    <div className={cn(theme.spacing.mt4, 'border-t', theme.border.default, theme.spacing.pt4)}>
                      {milestone.description && (
                        <p className={cn(theme.spacing.mb4, theme.text.sm, theme.font.medium, theme.text.primary)}>
                          {milestone.description}
                        </p>
                      )}

                      {milestoneTasks.length === 0 ? (
                        <p className={cn('py-4 text-center', theme.text.sm, theme.text.tertiary)}>
                          Nessun task assegnato a questa milestone
                        </p>
                      ) : (
                        <TaskTreeList
                          tasks={milestoneTasks}
                          allTasks={tasks}
                          onTaskClick={(task) => setSelectedTask(task)}
                          onTimerStart={loadData}
                          showProject={false}
                          showGrid={true}
                        />
                      )}
                    </div>
                  )}
                </GamingCard>
              );
            })}

            {/* Unassigned Tasks Section */}
            {unassignedTasks.length > 0 && (
              <GamingCard className={cn('border', theme.border.default, theme.bg.secondary)}>
                <div
                  className={cn(
                    '-m-6',
                    theme.layout.flexRow,
                    theme.layout.itemsCenter,
                    theme.spacing.gap3,
                    'rounded-xl',
                    theme.spacing.p6,
                    'cursor-pointer transition-colors',
                    theme.bg.hover
                  )}
                  onClick={() => setShowUnassignedTasks(!showUnassignedTasks)}
                >
                  <button className={cn(theme.text.tertiary, 'hover:' + theme.colors.accent)}>
                    {showUnassignedTasks ? (
                      <ChevronDown className={theme.icon.base} />
                    ) : (
                      <ChevronRight className={theme.icon.base} />
                    )}
                  </button>

                  <div className={theme.layout.flex1}>
                    <h4 className={cn(theme.font.semibold, theme.text.white)}>
                      Task senza milestone ({unassignedTasks.length})
                    </h4>
                    <p className={cn(theme.text.sm, theme.text.primary)}>
                      Attività non ancora assegnate a una fase specifica
                    </p>
                  </div>
                </div>

                {showUnassignedTasks && (
                  <div className={cn(theme.spacing.mt4, 'border-t', theme.border.default, theme.spacing.pt4)}>
                    <TaskTreeList
                      tasks={unassignedTasks}
                      allTasks={tasks}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showProject={false}
                      showGrid={true}
                    />
                  </div>
                )}
              </GamingCard>
            )}

            {/* Empty State for No Milestones */}
            {milestones.length === 0 && (
              <GamingCard className="py-12 text-center">
                <Target className={cn('mx-auto', theme.spacing.mb4, 'h-16 w-16', theme.text.muted)} />
                <p className={cn(theme.spacing.mb4, theme.text.primary)}>Nessuna milestone definita</p>
                <p className={cn(theme.spacing.mb6, theme.text.sm, theme.text.tertiary)}>
                  Organizza i task in fasi (milestone) per una migliore pianificazione
                </p>
                <Button
                  onClick={() => {
                    setSelectedMilestone(null);
                    setShowMilestoneModal(true);
                  }}
                >
                  Crea la prima milestone
                </Button>
              </GamingCard>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={loadData} />
      )}

      {showCreateTask && (
        <CreateTaskModal
          projects={[project]}
          defaultProjectId={project.id}
          defaultMilestoneId={defaultMilestoneForTask}
          onClose={() => {
            setShowCreateTask(false);
            setDefaultMilestoneForTask(null);
          }}
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

      {showMilestoneModal && (
        <MilestoneModal
          milestone={selectedMilestone}
          projectId={id}
          onClose={() => {
            setShowMilestoneModal(false);
            setSelectedMilestone(null);
          }}
          onSave={() => {
            setShowMilestoneModal(false);
            setSelectedMilestone(null);
            loadData();
          }}
        />
      )}
    </GamingLayout>
  );
}
