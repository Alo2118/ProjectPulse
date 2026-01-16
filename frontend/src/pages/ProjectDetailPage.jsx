import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Archive, Clock, CheckCircle, AlertCircle, Target, Calendar, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import TaskTreeList from '../components/TaskTreeList';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectModal from '../components/ProjectModal';
import MilestoneModal from '../components/MilestoneModal';
import { formatTime } from '../utils/helpers';
import { GamingLayout, GamingHeader, GamingCard, GamingLoader, GamingKPICard, GamingKPIGrid } from '../components/ui';

export default function ProjectDetailPage() {
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
        milestonesApi.getByProject(id)
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
      alert(error.response?.data?.error || 'Errore durante l\'eliminazione');
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

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  const getTasksForMilestone = useCallback((milestoneId) => {
    return tasks.filter(t => t.milestone_id === milestoneId);
  }, [tasks]);

  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.milestone_id && !t.parent_task_id);
  }, [tasks]);

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    total_time: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  }), [tasks]);

  const completionRate = useMemo(() =>
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    [stats]
  );

  if (loading) {
    return <GamingLoader message="Caricamento progetto..." />;
  }

  if (!project) return null;

  return (
    <GamingLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="mb-4 px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-lg font-medium transition-all flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna ai Progetti
      </button>

      <GamingHeader
        title={project.name}
        subtitle={project.description || `Creato da ${project.creator_name}`}
        icon={Target}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditProject(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifica
            </button>
            <button
              onClick={handleArchive}
              className="px-4 py-2 bg-slate-800 hover:bg-red-900/50 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archivia
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuovo Task
            </button>
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
        <GamingCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Progresso Complessivo</h3>
            <span className="text-3xl font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 relative"
              style={{ width: `${completionRate}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm text-slate-800 font-semibold">
            {stats.completed} di {stats.total} task completati
          </p>
        </GamingCard>
      )}

      {/* Milestones and Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Target className="w-7 h-7 text-blue-600" />
            Milestone e Attività
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuova Attività
            </button>
            <button
              onClick={() => {
                setSelectedMilestone(null);
                setShowMilestoneModal(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold shadow-xl hover:shadow-2xl transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuova Milestone
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <GamingCard className="text-center py-12">
            <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-700 mb-6">Nessun task in questo progetto</p>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              Crea il primo task
            </button>
          </GamingCard>
        ) : (
          <div className="space-y-4">
            {/* Milestone Accordion Items */}
            {milestones.map((milestone) => {
              const milestoneTasks = getTasksForMilestone(milestone.id);
              const isExpanded = expandedMilestones.has(milestone.id);
              const milestoneProgress = milestoneTasks.length > 0
                ? Math.round((milestoneTasks.filter(t => t.status === 'completed').length / milestoneTasks.length) * 100)
                : 0;
              const isCompleted = milestone.status === 'completed';
              const isCancelled = milestone.status === 'cancelled';
              const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

              return (
                <GamingCard key={milestone.id} className={
                  `bg-slate-800/90 ${
                  isCompleted ? 'border-emerald-500/50' :
                  isCancelled ? 'opacity-70' :
                  isOverdue ? 'border-red-500/50' :
                  ''}`
                }>
                  {/* Milestone Header */}
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/30 -m-6 p-6 rounded-xl transition-colors"
                    onClick={() => toggleMilestone(milestone.id)}
                  >
                    <button className="text-slate-500 hover:text-blue-600">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-lg text-slate-900">
                          {milestone.name}
                        </h4>
                        {isCompleted && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="text-sm text-slate-600">
                          ({milestoneTasks.length} task)
                        </span>
                      </div>

                      {milestone.description && !isExpanded && (
                        <p className="text-sm text-slate-700 line-clamp-1">
                          {milestone.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2">
                        {/* Progress */}
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-300">
                            <div
                              className={`h-full rounded-full transition-all shadow-sm ${
                                isCompleted ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-blue-600 to-blue-500'
                              }`}
                              style={{ width: `${milestoneProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-800 font-bold">{milestoneProgress}%</span>
                        </div>

                        {/* Due Date */}
                        {dueDate && (
                          <div className={`flex items-center gap-1 text-xs font-semibold ${
                            isOverdue ? 'text-red-700' : 'text-slate-700'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
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
                          <button
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setShowMilestoneModal(true);
                            }}
                            className="px-3 py-1.5 bg-white border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-700 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                            title="Modifica milestone"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMilestoneComplete(milestone.id)}
                            className="px-3 py-1.5 bg-white border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-700 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                            title="Completa milestone"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {(isCompleted || isCancelled) && (
                        <button
                          onClick={() => handleMilestoneDelete(milestone.id)}
                          className="px-3 py-1.5 bg-white border-2 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-700 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                          title="Elimina milestone"
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Tasks */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t-2 border-slate-200">
                      {milestone.description && (
                        <p className="text-sm text-slate-800 mb-4 font-medium">
                          {milestone.description}
                        </p>
                      )}

                      {milestoneTasks.length === 0 ? (
                        <p className="text-center text-slate-600 text-sm py-4">
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
              <GamingCard className="bg-slate-800/80">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/30 -m-6 p-6 rounded-xl transition-colors"
                  onClick={() => setShowUnassignedTasks(!showUnassignedTasks)}
                >
                  <button className="text-slate-400 hover:text-cyan-400">
                    {showUnassignedTasks ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">
                      Task senza milestone ({unassignedTasks.length})
                    </h4>
                    <p className="text-sm text-slate-700">
                      Attività non ancora assegnate a una fase specifica
                    </p>
                  </div>
                </div>

                {showUnassignedTasks && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
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
              <GamingCard className="text-center py-12">
                <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-700 mb-4">Nessuna milestone definita</p>
                <p className="text-sm text-slate-600 mb-6">
                  Organizza i task in fasi (milestone) per una migliore pianificazione
                </p>
                <button
                  onClick={() => {
                    setSelectedMilestone(null);
                    setShowMilestoneModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium shadow-lg shadow-purple-500/50 transition-all"
                >
                  Crea la prima milestone
                </button>
              </GamingCard>
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
