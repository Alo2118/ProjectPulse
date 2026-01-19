import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { designTokens } from '../config/designTokens';
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
  const { colors } = useTheme();
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
      alert(error.response?.data?.error || 'Errore durante il completamento');
    }
  };

  const handleMilestoneDelete = async (milestoneId) => {
    if (!confirm('Eliminare questa milestone?')) return;
    try {
      await milestonesApi.delete(milestoneId);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || "Errore durante l'eliminazione");
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archiviare il progetto "${project.name}"?`)) return;

    try {
      await projectsApi.update(id, { archived: true });
      navigate('/projects');
    } catch (error) {
      alert(error.response?.data?.error || "Errore durante l'archiviazione");
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
        className={`mb-4 ${colors.border} ${colors.text.primary} hover:text-white`}
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai Progetti
      </Button>

      <GamingHeader
        title={project.name}
        subtitle={project.description || `Creato da ${project.creator_name}`}
        icon={Target}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditProject(true)}>
              <Edit className="h-4 w-4" />
              Modifica
            </Button>
            <Button variant="danger" size="sm" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              Archivia
            </Button>
            <Button size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4" />
              Nuovo Task
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <GamingKPIGrid columns={5} className="mb-6">
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
        <GamingCard className={`mb-6 ${colors.border} ${colors.bg.secondary}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Progresso Complessivo</h3>
            <span className={`text-3xl font-bold ${designTokens.colors.cyan.text}`}>{completionRate}%</span>
          </div>
          <div className={`mb-2 h-3 w-full overflow-hidden rounded-full ${colors.border} ${colors.bg.tertiary}`}>
            <div
              className="relative h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000"
              style={{ width: `${completionRate}%` }}
            >
              <div className="absolute inset-0 animate-pulse bg-white/10" />
            </div>
          </div>
          <p className={`text-sm font-semibold ${colors.text.primary}`}>
            {stats.completed} di {stats.total} task completati
          </p>
        </GamingCard>
      )}

      {/* Milestones and Tasks */}
      <div className="mb-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Target className={`h-7 w-7 ${designTokens.colors.cyan.text}`} />
            Milestone e Attività
          </h3>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className="h-4 w-4" />
              Nuova Attività
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedMilestone(null);
                setShowMilestoneModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuova Milestone
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <GamingCard className="py-12 text-center">
            <Target className="mx-auto mb-4 h-16 w-16 text-slate-500" />
            <p className={`mb-6 ${colors.text.secondary}`}>Nessun task in questo progetto</p>
            <Button onClick={() => setShowCreateTask(true)}>Crea il primo task</Button>
          </GamingCard>
        ) : (
          <div className="space-y-4">
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
                  className={`${colors.bg.secondary} ${
                    isCompleted
                      ? `border ${designTokens.colors.success.border}`
                      : isCancelled
                        ? 'opacity-70'
                        : isOverdue
                          ? `border ${designTokens.colors.error.border}`
                          : ''
                  }`}
                >
                  {/* Milestone Header */}
                  <div
                    className={`-m-6 flex cursor-pointer items-center gap-3 rounded-xl p-6 transition-colors ${colors.bg.hover}`}
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <button className={`${colors.text.tertiary} hover:${colors.text.accent}`}>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="text-lg font-bold text-white">{milestone.name}</h4>
                        {isCompleted && <CheckCircle className={`h-4 w-4 ${designTokens.colors.success.text}`} />}
                        <span className={`text-sm ${colors.text.tertiary}`}>
                          ({milestoneTasks.length} task)
                        </span>
                      </div>

                      {milestone.description && !isExpanded && (
                        <p className={`line-clamp-1 text-sm ${colors.text.secondary}`}>
                          {milestone.description}
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-4">
                        {/* Progress */}
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-32 overflow-hidden rounded-full ${colors.border} ${colors.bg.tertiary} shadow-inner`}>
                            <div
                              className={`h-full rounded-full shadow-sm transition-all ${
                                isCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                              }`}
                              style={{ width: `${milestoneProgress}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${colors.text.primary}`}>
                            {milestoneProgress}%
                          </span>
                        </div>

                        {/* Due Date */}
                        {dueDate && (
                          <div
                            className={`flex items-center gap-1 text-xs font-semibold ${
                              isOverdue ? designTokens.colors.error.text : colors.text.secondary
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            {dueDate.toLocaleDateString('it-IT')}
                            {isOverdue && ' (In ritardo)'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isCompleted && !isCancelled && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setShowMilestoneModal(true);
                            }}
                            className="px-3 py-1 text-xs"
                            title="Modifica milestone"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleMilestoneComplete(milestone.id)}
                            className="px-3 py-1 text-xs"
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
                          className="px-3 py-1 text-xs"
                          title="Elimina milestone"
                        >
                          Elimina
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {isExpanded && (
                    <div className={`mt-4 border-t ${colors.border} pt-4`}>
                      {milestone.description && (
                        <p className={`mb-4 text-sm font-medium ${colors.text.primary}`}>
                          {milestone.description}
                        </p>
                      )}

                      {milestoneTasks.length === 0 ? (
                        <p className={`py-4 text-center text-sm ${colors.text.tertiary}`}>
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
              <GamingCard className="border border-slate-800 bg-slate-900/70">
                <div
                  className="-m-6 flex cursor-pointer items-center gap-3 rounded-xl p-6 transition-colors hover:bg-slate-800/30"
                  onClick={() => setShowUnassignedTasks(!showUnassignedTasks)}
                >
                  <button className="text-slate-400 hover:text-cyan-400">
                    {showUnassignedTasks ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <h4 className="font-semibold text-white">
                      Task senza milestone ({unassignedTasks.length})
                    </h4>
                    <p className="text-sm text-slate-300">
                      Attività non ancora assegnate a una fase specifica
                    </p>
                  </div>
                </div>

                {showUnassignedTasks && (
                  <div className="mt-4 border-t border-slate-700/50 pt-4">
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
                <Target className="mx-auto mb-4 h-16 w-16 text-slate-500" />
                <p className="mb-4 text-slate-300">Nessuna milestone definita</p>
                <p className="mb-6 text-sm text-slate-400">
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
