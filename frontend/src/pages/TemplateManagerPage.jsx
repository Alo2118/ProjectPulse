import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Save,
  X,
  FileText,
  FolderOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import theme, { cn } from '../styles/theme';
import { useToast } from '../context/ToastContext';
import { templatesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canModify, canDelete, canCreate } from '../utils/permissions';
import { GamingLayout, GamingHeader, GamingCard, Button } from '../components/ui';

export default function TemplateManagerPage() {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [templates, setTemplates] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]); // For milestone and project editors
  const [milestoneTemplates, setMilestoneTemplates] = useState([]); // For project editor
  const [activeTab, setActiveTab] = useState('project'); // 'project', 'task', 'milestone'
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'project',
    icon: '📋',
    is_public: false,
    data: {},
  });

  useEffect(() => {
    loadTemplates();
    loadTaskTemplates(); // Load task templates for selectors
    loadMilestoneTemplates(); // Load milestone templates for project editor
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await templatesApi.getAll();
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
      showError('Errore nel caricamento dei template');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskTemplates = async () => {
    try {
      const response = await templatesApi.getAll({ type: 'task' });
      // Parse JSON data if it's a string
      const parsed = (response.data || []).map((t) => ({
        ...t,
        data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data,
      }));
      setTaskTemplates(parsed);
    } catch (error) {
      console.error('Error loading task templates:', error);
    }
  };

  const loadMilestoneTemplates = async () => {
    try {
      const response = await templatesApi.getAll({ type: 'milestone' });
      // Parse JSON data if it's a string
      const parsed = (response.data || []).map((t) => ({
        ...t,
        data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data,
      }));
      setMilestoneTemplates(parsed);
    } catch (error) {
      console.error('Error loading milestone templates:', error);
    }
  };

  const handleCreate = (type) => {
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      type: type,
      icon: type === 'project' ? '📁' : type === 'task' ? '📋' : '🎯',
      is_public: false,
      data: getDefaultDataForType(type),
    });
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      icon: template.icon,
      is_public: template.is_public,
      data: template.data || {},
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;

    try {
      await templatesApi.delete(id);
      loadTemplates();
      // Reload task and milestone templates for selectors
      loadTaskTemplates();
      loadMilestoneTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError(error.response?.data?.error || "Errore durante l'eliminazione");
    }
  };

  const handleDuplicate = (template) => {
    setSelectedTemplate(null);
    setFormData({
      name: `${template.name} (copia)`,
      description: template.description || '',
      type: template.type,
      icon: template.icon,
      is_public: false,
      data: template.data || {},
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedTemplate) {
        await templatesApi.update(selectedTemplate.id, formData);
      } else {
        await templatesApi.create(formData);
      }
      loadTemplates();
      // Reload task and milestone templates for selectors
      loadTaskTemplates();
      loadMilestoneTemplates();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      showError(error.response?.data?.error || 'Errore durante il salvataggio');
    }
  };

  const getDefaultDataForType = (type) => {
    switch (type) {
      case 'project':
        return {
          description: '',
          milestones: [], // Array of milestone template names
        };
      case 'task':
        return {
          description: '',
          priority: 'medium',
          estimated_hours: 0,
          subtasks: [],
        };
      case 'milestone':
        return {
          description: '',
          duration_days: 30,
          tasks: [], // Array of task template names
        };
      default:
        return {};
    }
  };

  const filteredTemplates = templates.filter((t) => t.type === activeTab);

  const tabs = [
    { id: 'project', label: 'Progetti', icon: FolderOpen, color: 'blue' },
    { id: 'task', label: 'Task', icon: FileText, color: 'green' },
    { id: 'milestone', label: 'Milestone', icon: Target, color: 'purple' },
  ];

  return (
    <GamingLayout>
      <GamingHeader
        title="Gestione Template"
        subtitle="Crea e gestisci template riutilizzabili per progetti, task e milestone"
        icon={FileText}
        actions={
          <Button
            onClick={() => handleCreate(activeTab)}
            disabled={!canCreate(user, 'template')}
            variant="primary"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuovo Template</span>
            <span className="inline sm:hidden">Nuovo</span>
          </Button>
        }
      />

      {/* Tabs */}
      <div className={cn(theme.layout.spacing.section, 'flex flex-wrap gap-2', theme.borders.bottom)}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all sm:text-base',
                theme.effects.rounded.lg,
                'rounded-t-lg border-b-2',
                isActive
                  ? cn(
                      theme.colors.border.accent,
                      theme.colors.bg.secondary,
                      theme.colors.text.accent,
                      theme.effects.shadow.glow
                    )
                  : cn(
                      'border-transparent',
                      theme.colors.text.tertiary,
                      theme.effects.hover.bg,
                      'hover:text-slate-200 dark:hover:text-white'
                    )
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline text-xs sm:hidden">
                ({templates.filter((t) => t.type === tab.id).length})
              </span>
              <span className={cn(
                'ml-2 hidden px-2 py-0.5 text-xs font-semibold sm:inline',
                theme.effects.rounded.full,
                theme.borders.default,
                theme.colors.bg.tertiary,
                theme.colors.text.primary
              )}>
                {templates.filter((t) => t.type === tab.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <GamingCard className="py-12 text-center">
          <div className="loading-spinner mx-auto" />
          <p className="loading-text mt-4">Caricamento template...</p>
        </GamingCard>
      ) : filteredTemplates.length === 0 ? (
        <GamingCard className="py-12 text-center">
          <div className="mb-4 text-6xl">📋</div>
          <h3 className={cn('mb-2 text-lg font-bold', theme.colors.text.primary)}>
            Nessun template trovato
          </h3>
          <p className={cn(theme.colors.text.tertiary, 'mb-6')}>
            Crea il tuo primo template per iniziare
          </p>
          <Button onClick={() => handleCreate(activeTab)} variant="primary">
            Crea Template
          </Button>
        </GamingCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <GamingCard
              key={template.id}
              className={cn(
                'group cursor-pointer transition-all',
                'hover:border-cyan-400 dark:hover:border-cyan-500/30'
              )}
              onClick={() => handleEdit(template)}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{template.icon}</div>
                  <div>
                    <h3 className={cn('font-bold', theme.colors.text.primary)}>
                      {template.name}
                    </h3>
                    {template.is_public && <span className="badge-status-active">Pubblico</span>}
                  </div>
                </div>
              </div>

              {template.description && (
                <p className={cn('mb-4 line-clamp-2 text-sm', theme.colors.text.secondary)}>
                  {template.description}
                </p>
              )}

              {/* Template Details */}
              <div className={cn('mb-4 text-sm', theme.colors.text.secondary)}>
                {template.type === 'project' && template.data?.milestones && (
                  <div className="font-semibold">
                    📊 {template.data.milestones.length} milestone
                  </div>
                )}
                {template.type === 'task' && (
                  <div className="font-semibold">
                    ⏱️ {template.data?.estimated_hours || 0}h
                    {template.data?.subtasks && ` • ${template.data.subtasks.length} subtask`}
                  </div>
                )}
                {template.type === 'milestone' && template.data?.duration_days && (
                  <div className="font-semibold">📅 {template.data.duration_days} giorni</div>
                )}
              </div>

              <div className={cn('mb-4 text-xs font-medium', theme.colors.text.tertiary)}>
                Creato da: {template.created_by_name || 'N/A'}
              </div>

              {/* Actions */}
              <div className={cn('flex gap-2 pt-4', theme.borders.top)}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(template);
                  }}
                  className="flex-1"
                  disabled={!canModify(user, template, 'template')}
                >
                  <Edit2 size={16} className="mr-1 inline" />
                  Modifica
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(template);
                  }}
                  title="Duplica template"
                  className={cn(theme.colors.text.accentBright, 'hover:text-white')}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                  disabled={!canDelete(user, template, 'template')}
                  title="Elimina template"
                  className="text-red-200 hover:text-white"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </GamingCard>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-4',
          theme.effects.backdrop.dark
        )}>
          <GamingCard className={cn(
            'max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6',
            theme.effects.shadow.xl
          )}>
            <div className={cn('mb-6 flex items-center justify-between pb-4', theme.borders.bottom)}>
              <h2 className={cn(
                'flex items-center gap-2 text-2xl font-bold',
                theme.colors.text.accent
              )}>
                <FileText className={cn('h-6 w-6', theme.colors.text.accentLight)} />
                {selectedTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className={cn(
                  theme.colors.text.secondary,
                  theme.effects.transition.colors,
                  'hover:text-cyan-600 dark:hover:text-cyan-300'
                )}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-label mb-1">Nome Template *</label>
                <input
                  type="text"
                  className="input-dark w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-label mb-1">Descrizione</label>
                <textarea
                  className="textarea-dark w-full"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-label mb-1">Icona (emoji)</label>
                <input
                  type="text"
                  className="input-dark w-full"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📋"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  className={cn(
                    'rounded border-slate-700 bg-slate-900',
                    theme.colors.text.accent,
                    'focus:ring-2 focus:ring-cyan-400'
                  )}
                />
                <label htmlFor="is_public" className={cn('text-sm font-medium', theme.colors.text.primary)}>
                  Template pubblico (visibile a tutti gli utenti)
                </label>
              </div>

              {/* Type-specific fields */}
              <TemplateDataEditor
                type={formData.type}
                data={formData.data}
                onChange={(newData) => setFormData({ ...formData, data: newData })}
                taskTemplates={taskTemplates}
                milestoneTemplates={milestoneTemplates}
              />

              {/* Actions */}
              <div className={cn('flex gap-3 pt-4', theme.borders.top)}>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex flex-1 items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {selectedTemplate ? 'Salva Modifiche' : 'Crea Template'}
                </Button>
              </div>
            </form>
          </GamingCard>
        </div>
      )}
    </GamingLayout>
  );
}

// Component for editing template-specific data
function TemplateDataEditor({ type, data, onChange, taskTemplates = [], milestoneTemplates = [] }) {
  if (type === 'project') {
    const selectedMilestones = data.milestones || [];

    const toggleMilestoneForProject = (milestoneName) => {
      if (selectedMilestones.includes(milestoneName)) {
        onChange({ ...data, milestones: selectedMilestones.filter((m) => m !== milestoneName) });
      } else {
        onChange({ ...data, milestones: [...selectedMilestones, milestoneName] });
      }
    };

    return (
      <div className={cn(theme.effects.rounded.lg, theme.borders.default, theme.colors.bg.secondary, 'p-4')}>
        <h4 className={cn('mb-3 font-bold', theme.colors.text.primary)}>Dati Progetto</h4>
        <div className="space-y-3">
          {/* Descrizione generale */}
          <div>
            <label className="text-label mb-1">Descrizione Progetto</label>
            <textarea
              className="textarea-dark w-full"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione generale del progetto..."
            />
          </div>

          {/* Milestone Template selector */}
          <div>
            <label className="text-label mb-1">
              Milestone da Creare ({selectedMilestones.length} selezionate)
            </label>
            {milestoneTemplates.length === 0 ? (
              <p className={cn(
                'rounded border border-dashed p-3 text-center text-sm font-medium',
                theme.borders.default,
                theme.colors.text.secondary
              )}>
                Nessun milestone template disponibile. Crea prima dei milestone template.
              </p>
            ) : (
              <div className={cn(
                'max-h-60 space-y-2 overflow-y-auto p-3',
                theme.effects.rounded.DEFAULT,
                theme.borders.default,
                theme.colors.bg.secondary
              )}>
                {milestoneTemplates.map((milestone) => (
                  <label
                    key={milestone.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 p-2 transition-colors',
                      theme.effects.rounded.DEFAULT,
                      theme.effects.hover.bg
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMilestones.includes(milestone.name)}
                      onChange={() => toggleMilestoneForProject(milestone.name)}
                      className={cn(
                        'rounded focus:ring-cyan-400',
                        theme.borders.default,
                        theme.colors.bg.tertiary,
                        theme.colors.text.accentLight
                      )}
                    />
                    <span className="text-2xl">{milestone.icon}</span>
                    <div className="flex-1">
                      <div className={cn('text-sm font-bold', theme.colors.text.primary)}>
                        {milestone.name}
                      </div>
                      {milestone.description && (
                        <div className={cn('text-xs', theme.colors.text.secondary)}>
                          {milestone.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {milestone.data && milestone.data.duration_days && (
                        <span className={cn(
                          'px-2 py-1 text-xs font-semibold',
                          theme.effects.rounded.DEFAULT,
                          theme.borders.default,
                          theme.colors.bg.secondary,
                          theme.colors.text.primary
                        )}>
                          {milestone.data.duration_days} giorni
                        </span>
                      )}
                      {milestone.data &&
                        milestone.data.tasks &&
                        milestone.data.tasks.length > 0 && (
                          <span className={cn(
                            'px-2 py-1 text-xs font-semibold',
                            theme.effects.rounded.DEFAULT,
                            theme.borders.default,
                            theme.colors.bg.accent,
                            theme.colors.text.accentBright
                          )}>
                            {milestone.data.tasks.length} task
                          </span>
                        )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className={cn('mt-2 text-xs font-medium', theme.colors.text.secondary)}>
              💡 Queste milestone (con le loro task) verranno create automaticamente quando si crea
              un progetto con questo template
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'task') {
    return (
      <div className={cn(theme.effects.rounded.lg, theme.borders.default, theme.colors.bg.secondary, 'p-4')}>
        <h4 className={cn('mb-3 font-bold', theme.colors.text.primary)}>Dati Task</h4>
        <div className="space-y-3">
          <div>
            <label className="text-label mb-1">Descrizione Task</label>
            <textarea
              className="textarea-dark w-full"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label mb-1">Priorità</label>
              <select
                className="input-dark w-full"
                value={data.priority || 'medium'}
                onChange={(e) => onChange({ ...data, priority: e.target.value })}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="text-label mb-1">Ore Stimate</label>
              <input
                type="number"
                min="0"
                className="input-dark w-full"
                value={data.estimated_hours || 0}
                onChange={(e) =>
                  onChange({ ...data, estimated_hours: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-label mb-1">Subtask (uno per riga)</label>
            <textarea
              className="textarea-dark w-full"
              rows="5"
              value={(data.subtasks || []).join('\n')}
              onChange={(e) =>
                onChange({ ...data, subtasks: e.target.value.split('\n').filter((s) => s.trim()) })
              }
              placeholder="Prepara ambiente di test&#10;Esegui test funzionali&#10;Documenta risultati"
            />
            <p className={cn('mt-1 text-xs font-medium', theme.colors.text.secondary)}>
              {(data.subtasks || []).length} subtask configurati
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'milestone') {
    const selectedTasks = data.tasks || [];

    const toggleTaskForMilestone = (taskName) => {
      if (selectedTasks.includes(taskName)) {
        onChange({ ...data, tasks: selectedTasks.filter((t) => t !== taskName) });
      } else {
        onChange({ ...data, tasks: [...selectedTasks, taskName] });
      }
    };

    return (
      <div className={cn(theme.effects.rounded.lg, theme.borders.default, theme.colors.bg.secondary, 'p-4')}>
        <h4 className={cn('mb-3 font-bold', theme.colors.text.primary)}>Dati Milestone</h4>
        <div className="space-y-3">
          <div>
            <label className="text-label mb-1">Descrizione Milestone</label>
            <textarea
              className="textarea-dark w-full"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione della milestone..."
            />
          </div>

          <div>
            <label className="text-label mb-1">Durata (giorni)</label>
            <input
              type="number"
              min="1"
              className="input-dark w-full"
              value={data.duration_days || 30}
              onChange={(e) => onChange({ ...data, duration_days: parseInt(e.target.value) || 30 })}
            />
          </div>

          {/* Task selector */}
          <div>
            <label className="text-label mb-1">
              Task da Creare ({selectedTasks.length} selezionati)
            </label>
            {taskTemplates.length === 0 ? (
              <p className={cn(
                'rounded border border-dashed p-3 text-center text-sm font-medium',
                theme.borders.default,
                theme.colors.text.secondary
              )}>
                Nessun task template disponibile. Crea prima dei task template.
              </p>
            ) : (
              <div className={cn(
                'max-h-60 space-y-2 overflow-y-auto p-3',
                theme.effects.rounded.DEFAULT,
                theme.borders.default,
                theme.colors.bg.secondary
              )}>
                {taskTemplates.map((task) => (
                  <label
                    key={task.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 p-2 transition-colors',
                      theme.effects.rounded.DEFAULT,
                      theme.effects.hover.bg
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.name)}
                      onChange={() => toggleTaskForMilestone(task.name)}
                      className={cn(
                        'rounded focus:ring-cyan-400',
                        theme.borders.default,
                        theme.colors.bg.tertiary,
                        theme.colors.text.accentLight
                      )}
                    />
                    <span className="text-2xl">{task.icon}</span>
                    <div className="flex-1">
                      <div className={cn('text-sm font-bold', theme.colors.text.primary)}>
                        {task.name}
                      </div>
                      {task.description && (
                        <div className={cn('text-xs', theme.colors.text.secondary)}>
                          {task.description}
                        </div>
                      )}
                    </div>
                    {task.data && task.data.estimated_hours > 0 && (
                      <span className={cn(
                        'px-2 py-1 text-xs font-semibold',
                        theme.effects.rounded.DEFAULT,
                        theme.borders.default,
                        theme.colors.bg.secondary,
                        theme.colors.text.primary
                      )}>
                        {task.data.estimated_hours}h
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className={cn('mt-2 text-xs font-medium', theme.colors.text.secondary)}>
              💡 Questi task verranno creati automaticamente quando si crea un progetto con questa
              milestone
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
