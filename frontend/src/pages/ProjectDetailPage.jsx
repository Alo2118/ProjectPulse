import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Archive, Clock, CheckCircle, AlertCircle, Target, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectModal from '../components/ProjectModal';
import MilestoneModal from '../components/MilestoneModal';
import { formatTime } from '../utils/helpers';

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
      // Handle paginated response from tasks API
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

  // Memoize task filtering functions
  const getTasksForMilestone = useCallback((milestoneId) => {
    return tasks.filter(t => t.milestone_id === milestoneId);
  }, [tasks]);

  const unassignedTasks = useMemo(() => {
    return tasks.filter(t => !t.milestone_id && !t.parent_task_id);
  }, [tasks]);

  // Memoize stats calculation
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="btn-secondary flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna ai Progetti
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-1 text-sm">{project.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Task Totali</div>
          </div>

          <div className="card text-center bg-green-50 border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-0.5" />
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-green-600">Completati</div>
          </div>

          <div className="card text-center bg-blue-50 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            <div className="text-xs text-blue-600">In Corso</div>
          </div>

          <div className="card text-center bg-red-50 border-red-200">
            <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-0.5" />
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <div className="text-xs text-red-600">Bloccati</div>
          </div>

          <div className="card text-center">
            <Clock className="w-5 h-5 text-gray-500 mx-auto mb-0.5" />
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(stats.total_time)}
            </div>
            <div className="text-xs text-gray-500">Tempo Totale</div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-4">
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

        {/* Milestones and Tasks Accordion View */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Milestone e Attività
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuova Attività
              </button>
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setShowMilestoneModal(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuova Milestone
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 card">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Nessun task in questo progetto</p>
              <button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary"
              >
                Crea il primo task
              </button>
            </div>
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
                  <div key={milestone.id} className={`card ${
                    isCompleted ? 'bg-green-50 border-green-200' :
                    isCancelled ? 'bg-gray-100 opacity-70' :
                    isOverdue ? 'bg-red-50 border-red-200' :
                    'bg-white'
                  }`}>
                    {/* Milestone Header */}
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 -m-4 p-4 rounded-lg transition-colors"
                      onClick={() => toggleMilestone(milestone.id)}
                    >
                      <button className="text-gray-500 hover:text-gray-700">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {milestone.name}
                          </h4>
                          {isCompleted && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <span className="text-sm text-gray-500">
                            ({milestoneTasks.length} task)
                          </span>
                        </div>

                        {milestone.description && !isExpanded && (
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {milestone.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2">
                          {/* Progress */}
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isCompleted ? 'bg-green-600' : 'bg-primary-600'
                                }`}
                                style={{ width: `${milestoneProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{milestoneProgress}%</span>
                          </div>

                          {/* Due Date */}
                          {dueDate && (
                            <div className={`flex items-center gap-1 text-xs ${
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
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
                              className="btn-secondary text-xs px-2 py-1"
                              title="Modifica milestone"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMilestoneComplete(milestone.id)}
                              className="btn-primary text-xs px-2 py-1"
                              title="Completa milestone"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {(isCompleted || isCancelled) && (
                          <button
                            onClick={() => handleMilestoneDelete(milestone.id)}
                            className="btn-secondary text-xs px-2 py-1"
                            title="Elimina milestone"
                          >
                            Elimina
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Tasks */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mb-4">
                            {milestone.description}
                          </p>
                        )}

                        {milestoneTasks.length === 0 ? (
                          <p className="text-center text-gray-500 text-sm py-4">
                            Nessun task assegnato a questa milestone
                          </p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {milestoneTasks.map(task => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                onClick={() => setSelectedTask(task)}
                                onTimerStart={loadData}
                                showProject={false}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned Tasks Section */}
              {unassignedTasks.length > 0 && (
                <div className="card bg-gray-50">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-100/50 -m-4 p-4 rounded-lg transition-colors"
                    onClick={() => setShowUnassignedTasks(!showUnassignedTasks)}
                  >
                    <button className="text-gray-500 hover:text-gray-700">
                      {showUnassignedTasks ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-700">
                        Task senza milestone ({unassignedTasks.length})
                      </h4>
                      <p className="text-sm text-gray-500">
                        Attività non ancora assegnate a una fase specifica
                      </p>
                    </div>
                  </div>

                  {showUnassignedTasks && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {unassignedTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task)}
                            onTimerStart={loadData}
                            showProject={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State for No Milestones */}
              {milestones.length === 0 && (
                <div className="card text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nessuna milestone definita</p>
                  <p className="text-sm text-gray-400 mb-4">
                    Organizza i task in fasi (milestone) per una migliore pianificazione
                  </p>
                  <button
                    onClick={() => {
                      setSelectedMilestone(null);
                      setShowMilestoneModal(true);
                    }}
                    className="btn-secondary"
                  >
                    Crea la prima milestone
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
    </div>
  );
}
