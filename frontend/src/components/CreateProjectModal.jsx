import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { projectsApi, milestonesApi, tasksApi, templatesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TemplateSelector from './TemplateSelector';
import TemplateManagerModal from './TemplateManagerModal';
import { useTemplates } from '../hooks/useTemplates';

export default function CreateProjectModal({ onClose, onCreate }) {
  const { user, isDirezione } = useAuth();
  const { colors, spacing } = useTheme();
  const { getAllTemplates, refresh: refreshTemplates } = useTemplates('project');

  const projectTemplates = getAllTemplates();
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(projectTemplates[0]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [createMilestones, setCreateMilestones] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load task templates from database
  useEffect(() => {
    const loadTaskTemplates = async () => {
      try {
        const response = await templatesApi.getAll({ type: 'task' });
        setTaskTemplates(response.data || []);
      } catch (error) {
        console.error('Error loading task templates:', error);
      }
    };
    loadTaskTemplates();
  }, []);

  // Apply template data when template changes
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.data) {
      setFormData((prev) => ({
        ...prev,
        description: selectedTemplate.data.description || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        description: '',
      }));
    }
  }, [selectedTemplate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Il nome del progetto è obbligatorio');
      return;
    }

    setLoading(true);
    try {
      // Create project
      const projectResponse = await projectsApi.create(formData);
      const newProject = projectResponse.data;

      // Create milestones if template has them and user wants them
      if (createMilestones && selectedTemplate?.data?.milestones) {
        const today = new Date();
        let cumulativeDays = 0;

        for (const milestoneTemplate of selectedTemplate.data.milestones) {
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() + cumulativeDays);

          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + milestoneTemplate.duration_days);

          const milestoneResponse = await milestonesApi.create({
            name: milestoneTemplate.name,
            description: milestoneTemplate.description,
            project_id: newProject.id,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'active',
          });

          const newMilestone = milestoneResponse.data;

          // Create tasks for this milestone if template has them
          if (milestoneTemplate.tasks && milestoneTemplate.tasks.length > 0) {
            for (const taskTemplateId of milestoneTemplate.tasks) {
              // Find the task template by ID or name in database
              let taskTemplate = taskTemplates.find(
                (t) =>
                  t.id === taskTemplateId ||
                  t.name === taskTemplateId ||
                  (typeof t.data === 'string' ? JSON.parse(t.data).id : t.data?.id) ===
                    taskTemplateId
              );

              if (taskTemplate) {
                // Parse data if it's a string
                const taskData =
                  typeof taskTemplate.data === 'string'
                    ? JSON.parse(taskTemplate.data)
                    : taskTemplate.data;

                // Create the task with template data
                const taskResponse = await tasksApi.create({
                  title: taskTemplate.name,
                  description: taskData.description || '',
                  project_id: newProject.id,
                  milestone_id: newMilestone.id,
                  priority: taskData.priority || 'medium',
                  estimated_hours: taskData.estimated_hours || 0,
                  status: 'todo',
                });

                const newTask = taskResponse.data;

                // Create subtasks if template has them
                if (taskData.subtasks && taskData.subtasks.length > 0) {
                  for (let i = 0; i < taskData.subtasks.length; i++) {
                    const subtaskTitle = taskData.subtasks[i];
                    await tasksApi.create({
                      title: subtaskTitle,
                      description: '',
                      project_id: newProject.id,
                      milestone_id: newMilestone.id,
                      parent_task_id: newTask.id,
                      order_index: i,
                      priority: 'medium',
                      status: 'todo',
                    });
                  }
                }
              }
            }
          }

          cumulativeDays += milestoneTemplate.duration_days;
        }
      }

      onCreate();
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      alert(error.response?.data?.error || 'Errore durante la creazione del progetto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl ${colors.bg.primary} shadow-2xl`}>
        <div className={`sticky top-0 flex items-center justify-between border-b ${colors.border} ${colors.bg.primary} px-6 py-4`}>
          <h2 className="text-xl font-bold text-gray-900">Nuovo Progetto R&D</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Template Selector */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TemplateSelector
                templates={projectTemplates}
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

          {/* Project Name */}
          <div>
            <label className="text-label mb-2 block">Nome Progetto *</label>
            <input
              type="text"
              className="input-dark w-full"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="es. Fissatore Esapodiale Gen 2"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-label mb-2 block">Descrizione</label>
            <textarea
              className="textarea-dark w-full"
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione dettagliata del progetto..."
            />
            {selectedTemplate?.data && (
              <p className="mt-1 text-xs text-primary-600">
                💡 Template applicato: descrizione pre-compilata
              </p>
            )}
          </div>

          {/* Create Milestones Option */}
          {selectedTemplate?.data?.milestones && (
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 shadow-sm">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={createMilestones}
                  onChange={(e) => setCreateMilestones(e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <div className="mb-1 text-sm font-medium text-blue-900">
                    Crea milestone automaticamente
                  </div>
                  <div className="text-xs text-blue-700">
                    Verranno create {selectedTemplate.data.milestones.length} milestone predefinite
                    per questo tipo di progetto:
                  </div>
                  <ul className="ml-4 mt-2 space-y-1 text-xs text-blue-600">
                    {selectedTemplate.data.milestones.map((m, i) => (
                      <li key={i}>
                        • {m.name} ({m.duration_days} giorni)
                      </li>
                    ))}
                  </ul>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className={`flex gap-3 border-t-2 ${colors.border} pt-4`}>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creazione...' : 'Crea Progetto'}
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
          type="project"
          onClose={() => {
            setShowTemplateManager(false);
            refreshTemplates();
          }}
        />
      )}
    </div>
  );
}
