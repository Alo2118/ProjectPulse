import { useState, useEffect } from 'react';
import { X, Plus, User, Settings } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { tasksApi, projectsApi, milestonesApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TemplateSelector from './TemplateSelector';
import TemplateManagerModal from './TemplateManagerModal';
import { useTemplates } from '../hooks/useTemplates';
import { SMART_DEFAULTS } from '../config/templates';
import { useToast } from '../context/ToastContext';

export default function CreateTaskModal({
  projects,
  onClose,
  onCreate,
  parentTaskId = null,
  defaultProjectId = null,
  defaultMilestoneId = null,
}) {
  const { colors, spacing } = useTheme();
  const { user, isAmministratore, isDirezione } = useAuth();
  const { getAllTemplates, refresh: refreshTemplates } = useTemplates('task');
  const { error: showError } = useToast();

  // Smart default: calcola deadline predefinita (+7 giorni)
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + SMART_DEFAULTS.task.deadlineOffset);
    return date.toISOString().split('T')[0];
  };

  // Smart default: recupera ultimo utente assegnato
  const getLastAssignedUser = () => {
    if (SMART_DEFAULTS.task.rememberLastAssignee) {
      return localStorage.getItem('lastAssignedUser') || '';
    }
    return '';
  };

  // Smart default: calcola data inizio basandosi su deadline e ore stimate
  const calculateSmartStartDate = (deadline, estimatedHours) => {
    if (!SMART_DEFAULTS.task.autoCalculateStartDate) {
      return new Date().toISOString().split('T')[0];
    }

    if (!deadline) {
      // Nessuna deadline: inizia oggi
      return new Date().toISOString().split('T')[0];
    }

    if (!estimatedHours || estimatedHours === 0) {
      // Nessuna stima ore: inizia oggi
      return new Date().toISOString().split('T')[0];
    }

    // Calcola data inizio: deadline - (estimated_hours / hoursPerWorkingDay)
    const deadlineDate = new Date(deadline);
    const workingDays = Math.ceil(estimatedHours / SMART_DEFAULTS.task.hoursPerWorkingDay);
    const startDate = new Date(deadlineDate);
    startDate.setDate(startDate.getDate() - workingDays);

    // Non permettere date di inizio nel passato
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return today.toISOString().split('T')[0];
    }

    return startDate.toISOString().split('T')[0];
  };

  const taskTemplates = getAllTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState(taskTemplates[0]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const defaultDeadline = getDefaultDeadline();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: defaultProjectId || '',
    milestone_id: defaultMilestoneId || '',
    priority: SMART_DEFAULTS.task.priorityByContext.default,
    deadline: defaultDeadline,
    assigned_to: getLastAssignedUser(),
    parent_task_id: parentTaskId,
    start_date: calculateSmartStartDate(defaultDeadline, 0),
    estimated_hours: 0,
    progress_percentage: 0,
  });
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAmministratore) {
      loadUsers();
    }
  }, [isAmministratore]);

  useEffect(() => {
    if (formData && formData.project_id) {
      loadMilestones(formData.project_id);
    } else {
      setMilestones([]);
      setFormData((prev) => ({ ...prev, milestone_id: '' }));
    }
  }, [formData?.project_id]);

  // Apply template data when template changes
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.data) {
      setFormData((prev) => ({
        ...prev,
        description: selectedTemplate.data.description || prev.description,
        priority: selectedTemplate.data.priority || prev.priority,
      }));
    }
  }, [selectedTemplate]);

  // Auto-calculate start_date when deadline or estimated_hours change
  useEffect(() => {
    if (formData.deadline || formData.estimated_hours) {
      const newStartDate = calculateSmartStartDate(formData.deadline, formData.estimated_hours);
      setFormData((prev) => ({
        ...prev,
        start_date: newStartDate,
      }));
    }
  }, [formData.deadline, formData.estimated_hours]);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll({ active: true });
      setUsers(response.data.filter((u) => u.role === 'dipendente'));
    } catch (error) {
      console.error('Error loading users:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let projectId = formData.project_id;

      // Create new project if needed
      if (showNewProject && newProjectName) {
        const response = await projectsApi.create({
          name: newProjectName,
          description: '',
        });
        projectId = response.data.id;
      }

      const assignedUserId = formData.assigned_to ? parseInt(formData.assigned_to) : user.id;

      // Save last assigned user for smart defaults
      if (SMART_DEFAULTS.task.rememberLastAssignee && formData.assigned_to) {
        localStorage.setItem('lastAssignedUser', formData.assigned_to);
      }

      // Create main task
      const taskResponse = await tasksApi.create({
        ...formData,
        project_id: projectId ? parseInt(projectId) : null,
        milestone_id: formData.milestone_id ? parseInt(formData.milestone_id) : null,
        assigned_to: assignedUserId,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : 0,
        progress_percentage: formData.progress_percentage
          ? parseInt(formData.progress_percentage)
          : 0,
      });

      const newTask = taskResponse.data;

      // Create subtasks if template has them
      if (selectedTemplate?.data?.subtasks && selectedTemplate.data.subtasks.length > 0) {
        for (let i = 0; i < selectedTemplate.data.subtasks.length; i++) {
          const subtaskTitle = selectedTemplate.data.subtasks[i];
          await tasksApi.create({
            title: subtaskTitle,
            description: '',
            project_id: projectId ? parseInt(projectId) : null,
            milestone_id: formData.milestone_id ? parseInt(formData.milestone_id) : null,
            assigned_to: assignedUserId,
            parent_task_id: newTask.id,
            order_index: i,
            priority: 'medium',
            status: 'todo',
          });
        }
      }

      onCreate();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      showError(error.response?.data?.error || 'Errore durante la creazione del task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl ${colors.bg.primary} shadow-2xl`}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Nuovo Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {/* Template Selector */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TemplateSelector
                  templates={taskTemplates}
                  onSelect={setSelectedTemplate}
                  selectedId={selectedTemplate?.id}
                />
              </div>
              {!isDirezione && (
                <button
                  type="button"
                  onClick={() => setShowTemplateManager(true)}
                  className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                  title="Gestisci template personalizzati"
                >
                  <Settings className="h-4 w-4" />
                  Gestisci
                </button>
              )}
            </div>

            {selectedTemplate?.data?.subtasks && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="mb-1 text-sm font-medium text-green-900">
                  ✨ Template con checklist integrata
                </div>
                <div className="text-xs text-green-700">
                  Verranno create automaticamente {selectedTemplate.data.subtasks.length} subtask
                </div>
              </div>
            )}

            <div>
              <label className="text-label mb-2 block">Titolo *</label>
              <input
                type="text"
                className="input-dark w-full"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-label mb-2 block">Descrizione</label>
              <textarea
                className="textarea-dark w-full"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              {selectedTemplate?.data?.description && (
                <p className="mt-1 text-xs text-primary-600">
                  💡 Descrizione pre-compilata dal template
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Progetto</label>
                <button
                  type="button"
                  onClick={() => setShowNewProject(!showNewProject)}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Nuovo progetto
                </button>
              </div>

              {showNewProject ? (
                <input
                  type="text"
                  className="input-dark w-full"
                  placeholder="Nome nuovo progetto"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              ) : (
                <select
                  className="input-dark w-full"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                >
                  <option value="">Nessun progetto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Milestone Selector - shown only if project is selected */}
            {formData.project_id && milestones.length > 0 && (
              <div>
                <label className="text-label mb-2 block">Milestone (Opzionale)</label>
                <select
                  className="input-dark w-full"
                  value={formData.milestone_id}
                  onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value })}
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
              </div>
            )}

            {/* Assigned User (only for amministratore) */}
            {isAmministratore && users.length > 0 && (
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  Assegna a
                </label>
                <select
                  className="input-dark w-full"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Seleziona dipendente</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
                {formData.assigned_to && getLastAssignedUser() === formData.assigned_to && (
                  <p className="mt-1 text-xs text-primary-600">
                    💡 Ultimo utente assegnato (smart default)
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-label mb-2 block">Priorità</label>
                <select
                  className="input-dark w-full"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
                <p className="mt-1 text-xs text-primary-600">
                  💡 Scadenza +{SMART_DEFAULTS.task.deadlineOffset} giorni (smart default)
                </p>
              </div>
            </div>

            {/* Gantt Planning Fields */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                📊 Pianificazione Gantt (Opzionale)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-label mb-2 block">Data inizio</label>
                  <input
                    type="date"
                    className="input-dark w-full"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-primary-600">
                    {formData.estimated_hours > 0
                      ? `💡 Calcolata: scadenza - ${Math.ceil(formData.estimated_hours / SMART_DEFAULTS.task.hoursPerWorkingDay)} giorni lavorativi`
                      : '💡 Default: oggi (modifica ore stimate per calcolo automatico)'}
                  </p>
                </div>

                <div>
                  <label className="text-label mb-2 block">Ore stimate</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input-dark w-full"
                    value={formData.estimated_hours}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">Aggiorna auto la data inizio</p>
                </div>

                <div>
                  <label className="text-label mb-2 block">Progresso %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    className="input-dark w-full"
                    value={formData.progress_percentage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const clamped = Math.min(100, Math.max(0, val));
                      setFormData({ ...formData, progress_percentage: clamped });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Info about auto-filled fields */}
            {(defaultProjectId || defaultMilestoneId) && (
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
                <div className="text-sm text-blue-900">
                  ℹ️ Campi pre-compilati automaticamente:
                  {defaultProjectId && (
                    <span className="mt-1 block text-xs text-blue-700">
                      • Progetto selezionato dal contesto
                    </span>
                  )}
                  {defaultMilestoneId && (
                    <span className="block text-xs text-blue-700">
                      • Milestone selezionata dal contesto
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`flex flex-shrink-0 gap-3 border-t-2 ${colors.border} p-6 pt-4`}>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creazione...' : 'Crea Task'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Annulla
            </button>
          </div>
        </form>
      </div>

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManagerModal
          type="task"
          onClose={() => {
            setShowTemplateManager(false);
            refreshTemplates();
          }}
        />
      )}
    </div>
  );
}
