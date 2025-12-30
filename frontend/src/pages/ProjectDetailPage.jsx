import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Archive, Clock, CheckCircle, AlertCircle, Target, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { projectsApi, tasksApi, milestonesApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectModal from '../components/ProjectModal';
import MilestoneModal from '../components/MilestoneModal';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
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
      setTasks(tasksRes.data);
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

  const getTasksForMilestone = (milestoneId) => {
    return tasks.filter(t => t.milestone_id === milestoneId);
  };

  const getUnassignedTasks = () => {
    return tasks.filter(t => !t.milestone_id);
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/projects')}
            className="btn-secondary flex items-center gap-2 mb-3"
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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
          <div className="card mb-6">
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

        {/* Milestones Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-600" />
              Milestone
            </h3>
            <button
              onClick={() => {
                setSelectedMilestone(null);
                setShowMilestoneModal(true);
              }}
              className="btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4" />
              Nuova Milestone
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="card text-center py-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">Nessuna milestone definita</p>
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {milestones.map((milestone, index) => {
                const milestoneProgress = milestone.task_count > 0
                  ? Math.round((milestone.completed_count / milestone.task_count) * 100)
                  : 0;
                const isCompleted = milestone.status === 'completed';
                const isCancelled = milestone.status === 'cancelled';
                const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
                const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

                return (
                  <div
                    key={milestone.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    className={`card hover:shadow-lg transition-all hover:-translate-y-1 animate-fade-in ${
                      isCompleted ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
                      isCancelled ? 'bg-gray-100 opacity-60' :
                      isOverdue ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' :
                      'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                          {milestone.name}
                          {isCompleted && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold text-gray-900">{milestoneProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isCompleted ? 'bg-green-600' : 'bg-primary-600'
                          }`}
                          style={{ width: `${milestoneProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-1 text-gray-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>{milestone.completed_count || 0}/{milestone.task_count || 0} task</span>
                      </div>
                      {milestone.total_time > 0 && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(milestone.total_time)}</span>
                        </div>
                      )}
                    </div>

                    {/* Due date */}
                    {dueDate && (
                      <div className={`flex items-center gap-1 text-sm mb-3 ${
                        isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        <span>
                          Scadenza: {dueDate.toLocaleDateString('it-IT')}
                          {isOverdue && ' (In ritardo)'}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!isCompleted && !isCancelled && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setShowMilestoneModal(true);
                            }}
                            className="btn-secondary flex-1 text-sm py-1.5"
                          >
                            <Edit className="w-3 h-3 inline mr-1" />
                            Modifica
                          </button>
                          <button
                            onClick={() => handleMilestoneComplete(milestone.id)}
                            className="btn-primary flex-1 text-sm py-1.5"
                          >
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Completa
                          </button>
                        </>
                      )}
                      {(isCompleted || isCancelled) && (
                        <button
                          onClick={() => handleMilestoneDelete(milestone.id)}
                          className="btn-secondary flex-1 text-sm py-1.5"
                        >
                          Elimina
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone Filter */}
        {tasks.length > 0 && milestones.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtra task per milestone
            </label>
            <select
              className="input max-w-md"
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
            >
              <option value="all">Tutte le attività ({tasks.length})</option>
              <option value="none">
                Senza milestone ({tasks.filter(t => !t.milestone_id).length})
              </option>
              {milestones.map(milestone => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name} ({tasks.filter(t => t.milestone_id === milestone.id).length})
                </option>
              ))}
            </select>
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
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nessun task in questa milestone</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* In Progress */}
            {groupedTasks.in_progress.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  In Corso ({groupedTasks.in_progress.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  Bloccati ({groupedTasks.blocked.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
                  In Attesa ({groupedTasks.waiting_clarification.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-gray-500 rounded-full"></span>
                  Da Fare ({groupedTasks.todo.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                  Completati ({groupedTasks.completed.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
