import { useState, useEffect } from 'react';
import { X, Clock, MessageSquare, Send, User, Trash2, Save } from 'lucide-react';
import { tasksApi, commentsApi, projectsApi, milestonesApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import SubtaskList from './SubtaskList';
import { useTemplates } from '../hooks/useTemplates';
import { useToast } from '../context/ToastContext';

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato',
};

export default function TaskModal({ task, onClose, onUpdate }) {
  const { user, isDirezione, isAmministratore } = useAuth();
  const { colors, spacing } = useTheme();
  const { saveCustomTemplate } = useTemplates('task');
  const { success, error: showError } = useToast();
  const [editedTask, setEditedTask] = useState(task);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sync editedTask with task prop changes
  useEffect(() => {
    if (task) {
      setEditedTask(task);
    }
  }, [task]);

  useEffect(() => {
    if (task && task.id) {
      loadComments();
      loadProjects();
      if (isAmministratore) {
        loadUsers();
      }
    }
  }, [task?.id, isAmministratore]);

  useEffect(() => {
    if (editedTask && editedTask.project_id) {
      loadMilestones(editedTask.project_id);
    } else {
      setMilestones([]);
    }
  }, [editedTask?.project_id]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadMilestones = async (projectId) => {
    try {
      const response = await milestonesApi.getByProject(projectId);
      setMilestones(response.data.filter((m) => m.status === 'active'));
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll({ active: true });
      // API returns array directly, not wrapped in data
      const usersData = Array.isArray(response.data) ? response.data : [];
      setUsers(usersData.filter((u) => u.role === 'dipendente'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadComments = async () => {
    if (!task || !task.id) return;

    try {
      const response = await commentsApi.getByTask(task.id);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSave = async () => {
    if (!task || !task.id || !editedTask) return;

    setLoading(true);
    try {
      // Convert string values to integers for numeric fields
      const updates = {
        ...editedTask,
        project_id: editedTask.project_id ? parseInt(editedTask.project_id) : null,
        milestone_id: editedTask.milestone_id ? parseInt(editedTask.milestone_id) : null,
        assigned_to: editedTask.assigned_to ? parseInt(editedTask.assigned_to) : null,
        estimated_hours: editedTask.estimated_hours ? parseInt(editedTask.estimated_hours) : 0,
        progress_percentage: editedTask.progress_percentage
          ? parseInt(editedTask.progress_percentage)
          : 0,
      };

      console.log('Sending updates to backend:', updates);
      const response = await tasksApi.update(task.id, updates);
      console.log('Backend response:', response.data);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      console.error('Error response:', error.response?.data);
      showError(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task || !task.id) return;

    try {
      await commentsApi.create({
        task_id: task.id,
        message: newComment,
      });
      setNewComment('');
      loadComments();
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'invio del commento");
    }
  };

  const handleDelete = async () => {
    if (!task || !task.id) return;

    if (
      !confirm(
        `Sei sicuro di voler eliminare il task "${task.title}"?\n\nQuesta azione non può essere annullata.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await tasksApi.delete(task.id);
      onUpdate();
      onClose();
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'eliminazione");
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!task) return;

    const templateName = prompt('Nome del template:', task.title);
    if (!templateName || !templateName.trim()) return;

    try {
      // Get subtasks for this task
      const subtasksResponse = await tasksApi.getSubtasks(task.id);
      const subtasks = subtasksResponse.data.map((st) => st.title);

      const template = {
        name: templateName.trim(),
        description: `Template creato da: ${task.title}`,
        icon: '📋',
        custom: true,
        data: {
          description: task.description || '',
          priority: task.priority || 'medium',
          subtasks: subtasks,
        },
      };

      saveCustomTemplate(template);
      success(
        `Template "${templateName}" salvato con successo!`,
        {
          title: 'Template salvato',
        }
      );
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Errore durante il salvataggio del template');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Safety check - prevent rendering if task is null
  if (!task || !editedTask) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="card-lg max-h-[90vh] w-full max-w-3xl animate-slide-up overflow-y-auto">
        <div className={`sticky top-0 z-10 flex items-center justify-between border-b-2 ${colors.border} ${colors.bg.secondary} px-6 py-4`}>
          <h2 className="card-header">Dettagli Task</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-cyan-400/60 transition-all hover:text-cyan-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className={`space-y-6 ${colors.bg.primary} p-6`}>
          {/* Title */}
          <div>
            <label className="text-label mb-2 block">Titolo</label>
            <input
              type="text"
              className="input-dark w-full"
              value={editedTask.title}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              disabled={isDirezione}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-label mb-2 block">Descrizione</label>
            <textarea
              className="input-dark w-full"
              rows="3"
              value={editedTask?.description || ''}
              onChange={(e) =>
                editedTask && setEditedTask({ ...editedTask, description: e.target.value })
              }
              disabled={isDirezione}
            />
          </div>

          {/* Project */}
          <div>
            <label className="text-label mb-2 block">Progetto</label>
            <select
              className="input-dark w-full"
              value={editedTask.project_id || ''}
              onChange={(e) =>
                setEditedTask({
                  ...editedTask,
                  project_id: e.target.value ? parseInt(e.target.value) : null,
                  milestone_id: null,
                })
              }
              disabled={isDirezione}
            >
              <option value="">Nessun progetto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Seleziona un progetto per spostare il task</p>
          </div>

          {/* Milestone */}
          {editedTask.project_id && milestones.length > 0 && (
            <div>
              <label className="text-label mb-2 block">Milestone (Opzionale)</label>
              <select
                className="input-dark w-full"
                value={editedTask.milestone_id || ''}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    milestone_id: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                disabled={isDirezione}
              >
                <option value="">Nessuna milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                    {milestone.due_date &&
                      ` (scad. ${new Date(milestone.due_date).toLocaleDateString('it-IT')})`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Assegna il task a una milestone specifica
              </p>
            </div>
          )}

          {/* Assigned User (only for amministratore) */}
          {isAmministratore && users.length > 0 && (
            <div>
              <label className="label mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Assegnato a
              </label>
              <select
                className="input-dark w-full"
                value={editedTask.assigned_to || ''}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    assigned_to: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              >
                <option value="">Nessun assegnatario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Assegna o riassegna il task a un dipendente
              </p>
            </div>
          )}

          {/* Status, Priority and Deadline */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-label mb-2 block">Stato</label>
              <select
                className="input-dark w-full"
                value={editedTask.status}
                onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value })}
                disabled={isDirezione}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-label mb-2 block">Priorità</label>
              <select
                className="input-dark w-full"
                value={editedTask.priority}
                onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                disabled={isDirezione}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="text-label mb-2 block">Scadenza</label>
              <input
                type="date"
                className="input-dark w-full"
                value={editedTask.deadline || ''}
                onChange={(e) => setEditedTask({ ...editedTask, deadline: e.target.value })}
                disabled={isDirezione}
              />
            </div>
          </div>

          {/* Gantt Planning Fields */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              📊 Pianificazione Gantt
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-label mb-2 block">Data inizio</label>
                <input
                  type="date"
                  className="input-dark w-full"
                  value={editedTask.start_date || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, start_date: e.target.value })}
                  disabled={isDirezione}
                />
                <p className="mt-1 text-xs text-gray-500">Quando inizia il lavoro</p>
              </div>

              <div>
                <label className="text-label mb-2 block">Ore stimate</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="input-dark w-full"
                  value={editedTask.estimated_hours || 0}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, estimated_hours: parseInt(e.target.value) || 0 })
                  }
                  disabled={isDirezione}
                />
                <p className="mt-1 text-xs text-gray-500">Durata prevista in ore</p>
              </div>

              <div>
                <label className="text-label mb-2 block">Progresso %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  className="input-dark w-full"
                  value={editedTask.progress_percentage || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    const clamped = Math.min(100, Math.max(0, val));
                    setEditedTask({ ...editedTask, progress_percentage: clamped });
                  }}
                  disabled={isDirezione}
                />
                <p className="mt-1 text-xs text-gray-500">Completamento visuale</p>
              </div>
            </div>
          </div>

          {/* Blocked reason */}
          {editedTask.status === 'blocked' && (
            <div>
              <label className="text-label mb-2 block">Motivo blocco</label>
              <textarea
                className="input-dark w-full"
                rows="2"
                value={editedTask.blocked_reason || ''}
                onChange={(e) => setEditedTask({ ...editedTask, blocked_reason: e.target.value })}
                disabled={isDirezione}
                placeholder="Descrivi perché il task è bloccato..."
              />
            </div>
          )}

          {/* Clarification needed */}
          {editedTask.status === 'waiting_clarification' && (
            <div>
              <label className="text-label mb-2 block">Chiarimenti richiesti</label>
              <textarea
                className="input-dark w-full"
                rows="2"
                value={editedTask.clarification_needed || ''}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, clarification_needed: e.target.value })
                }
                disabled={isDirezione}
                placeholder="Cosa necessita di chiarimento?"
              />
            </div>
          )}

          {/* Time spent */}
          {task.time_spent > 0 && (
            <div className="flex items-center gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-600">Tempo lavorato</div>
                <div className="text-lg font-bold text-blue-900">{formatTime(task.time_spent)}</div>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Comunicazioni</h3>
            </div>

            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">Nessun commento ancora</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`rounded-xl p-3 shadow-sm ${
                      comment.is_from_direction
                        ? 'border-2 border-yellow-200 bg-yellow-50'
                        : 'border-2 border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.user_name}
                        {comment.is_from_direction && ' (Direzione)'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Scrivi un commento..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Subtasks */}
          <SubtaskList
            parentTask={task}
            onSubtaskClick={(subtask) => {
              // Reload task when clicking on subtask
              onUpdate();
            }}
            onUpdate={() => {
              // Reload parent task when subtasks change
              onUpdate();
            }}
          />

          {/* Actions */}
          <div className={`flex gap-3 border-t-2 ${colors.border} pt-4`}>
            {!isDirezione && (
              <>
                <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
                  {loading
                    ? 'Salvataggio...'
                    : isAmministratore
                      ? 'Salva assegnazione'
                      : 'Salva modifiche'}
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2 text-primary-600 hover:border-primary-300 hover:bg-primary-50"
                  title="Salva come template personalizzato"
                >
                  <Save className="h-4 w-4" />
                  Template
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn-secondary flex items-center gap-2 text-red-600 hover:border-red-300 hover:bg-red-50"
                  title="Elimina task"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              </>
            )}
            <button onClick={onClose} className="btn-secondary">
              {isDirezione ? 'Chiudi' : 'Annulla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
