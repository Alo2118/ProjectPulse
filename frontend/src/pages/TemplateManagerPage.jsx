import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Save, X, FileText, FolderOpen, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { templatesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { canModify, canDelete, canCreate } from '../utils/permissions';
import { GamingLayout, GamingHeader, GamingCard, Button } from '../components/ui';

export default function TemplateManagerPage() {
  const { user } = useAuth();
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
    data: {}
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
      alert('Errore nel caricamento dei template');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskTemplates = async () => {
    try {
      const response = await templatesApi.getAll({ type: 'task' });
      // Parse JSON data if it's a string
      const parsed = (response.data || []).map(t => ({
        ...t,
        data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data
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
      const parsed = (response.data || []).map(t => ({
        ...t,
        data: typeof t.data === 'string' ? JSON.parse(t.data) : t.data
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
      data: getDefaultDataForType(type)
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
      data: template.data || {}
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
      alert(error.response?.data?.error || 'Errore durante l\'eliminazione');
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
      data: template.data || {}
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
      alert(error.response?.data?.error || 'Errore durante il salvataggio');
    }
  };

  const getDefaultDataForType = (type) => {
    switch (type) {
      case 'project':
        return {
          description: '',
          milestones: [] // Array of milestone template names
        };
      case 'task':
        return {
          description: '',
          priority: 'medium',
          estimated_hours: 0,
          subtasks: []
        };
      case 'milestone':
        return {
          description: '',
          duration_days: 30,
          tasks: [] // Array of task template names
        };
      default:
        return {};
    }
  };

  const filteredTemplates = templates.filter(t => t.type === activeTab);

  const tabs = [
    { id: 'project', label: 'Progetti', icon: FolderOpen, color: 'blue' },
    { id: 'task', label: 'Task', icon: FileText, color: 'green' },
    { id: 'milestone', label: 'Milestone', icon: Target, color: 'purple' }
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
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xl shadow-primary-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuovo Template</span>
            <span className="inline sm:hidden">Nuovo</span>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 rounded-t-lg transition-all font-bold text-sm sm:text-base ${
                isActive
                  ? 'border-primary-600 text-primary-600 bg-primary-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden text-xs">({templates.filter(t => t.type === tab.id).length})</span>
              <span className="hidden sm:inline ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
                {templates.filter(t => t.type === tab.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <GamingCard className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Caricamento template...</p>
        </GamingCard>
      ) : filteredTemplates.length === 0 ? (
        <GamingCard className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Nessun template trovato
          </h3>
          <p className="text-slate-600 mb-6">
            Crea il tuo primo template per iniziare
          </p>
          <Button
            onClick={() => handleCreate(activeTab)}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white shadow-xl shadow-primary-600/50 transition-all font-bold"
          >
            Crea Template
          </Button>
        </GamingCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <GamingCard
              key={template.id}
              className="cursor-pointer group hover:border-primary-500/50 transition-all"
              onClick={() => handleEdit(template)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{template.icon}</div>
                  <div>
                    <h3 className="font-bold text-slate-900">{template.name}</h3>
                    {template.is_public && (
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-semibold">
                        Pubblico
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {template.description}
                </p>
              )}

              {/* Template Details */}
              <div className="mb-4 text-sm text-slate-600">
                {template.type === 'project' && template.data?.milestones && (
                  <div className="font-semibold">📊 {template.data.milestones.length} milestone</div>
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

              <div className="text-xs text-slate-500 mb-4 font-medium">
                Creato da: {template.created_by_name || 'N/A'}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t-2 border-slate-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(template);
                  }}
                  className="flex-1 px-3 py-2 bg-white border-2 border-primary-300 hover:bg-primary-50 hover:border-primary-400 text-primary-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
                  disabled={!canModify(user, template, 'template')}
                >
                  <Edit2 size={16} className="inline mr-1" />
                  Modifica
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(template);
                  }}
                  className="px-3 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
                  title="Duplica template"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                  className="px-3 py-2 bg-white border-2 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md text-sm"
                  disabled={!canDelete(user, template, 'template')}
                  title="Elimina template"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </GamingCard>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GamingCard className="shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-600 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Nome Template *
                </label>
                <input
                  type="text"
                  className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Descrizione
                </label>
                <textarea
                  className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Icona (emoji)
                </label>
                <input
                  type="text"
                  className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
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
                  className="rounded border-2 border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_public" className="text-sm text-slate-900 font-medium">
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
              <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-600/50 hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {selectedTemplate ? 'Salva Modifiche' : 'Crea Template'}
                </button>
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
        onChange({ ...data, milestones: selectedMilestones.filter(m => m !== milestoneName) });
      } else {
        onChange({ ...data, milestones: [...selectedMilestones, milestoneName] });
      }
    };

    return (
      <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
        <h4 className="font-bold text-slate-900 mb-3">Dati Progetto</h4>
        <div className="space-y-3">
          {/* Descrizione generale */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Descrizione Progetto
            </label>
            <textarea
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione generale del progetto..."
            />
          </div>

          {/* Milestone Template selector */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Milestone da Creare ({selectedMilestones.length} selezionate)
            </label>
            {milestoneTemplates.length === 0 ? (
              <p className="text-sm text-slate-600 border-2 border-dashed border-slate-300 rounded p-3 text-center font-medium">
                Nessun milestone template disponibile. Crea prima dei milestone template.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border-2 border-slate-200 rounded p-3 space-y-2 bg-white">
                {milestoneTemplates.map((milestone) => (
                  <label
                    key={milestone.id}
                    className="flex items-center gap-3 p-2 hover:bg-primary-50 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMilestones.includes(milestone.name)}
                      onChange={() => toggleMilestoneForProject(milestone.name)}
                      className="rounded border-2 border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-2xl">{milestone.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{milestone.name}</div>
                      {milestone.description && (
                        <div className="text-xs text-slate-600">{milestone.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {milestone.data && milestone.data.duration_days && (
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">
                          {milestone.data.duration_days} giorni
                        </span>
                      )}
                      {milestone.data && milestone.data.tasks && milestone.data.tasks.length > 0 && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded font-semibold">
                          {milestone.data.tasks.length} task
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2 font-medium">
              💡 Queste milestone (con le loro task) verranno create automaticamente quando si crea un progetto con questo template
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'task') {
    return (
      <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
        <h4 className="font-bold text-slate-900 mb-3">Dati Task</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Descrizione Task
            </label>
            <textarea
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Priorità
              </label>
              <select
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={data.priority || 'medium'}
                onChange={(e) => onChange({ ...data, priority: e.target.value })}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Ore Stimate
              </label>
              <input
                type="number"
                min="0"
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={data.estimated_hours || 0}
                onChange={(e) => onChange({ ...data, estimated_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Subtask (uno per riga)
            </label>
            <textarea
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              rows="5"
              value={(data.subtasks || []).join('\n')}
              onChange={(e) => onChange({ ...data, subtasks: e.target.value.split('\n').filter(s => s.trim()) })}
              placeholder="Prepara ambiente di test&#10;Esegui test funzionali&#10;Documenta risultati"
            />
            <p className="text-xs text-slate-600 mt-1 font-medium">
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
        onChange({ ...data, tasks: selectedTasks.filter(t => t !== taskName) });
      } else {
        onChange({ ...data, tasks: [...selectedTasks, taskName] });
      }
    };

    return (
      <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
        <h4 className="font-bold text-slate-900 mb-3">Dati Milestone</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Descrizione Milestone
            </label>
            <textarea
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione della milestone..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Durata (giorni)
            </label>
            <input
              type="number"
              min="1"
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              value={data.duration_days || 30}
              onChange={(e) => onChange({ ...data, duration_days: parseInt(e.target.value) || 30 })}
            />
          </div>

          {/* Task selector */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Task da Creare ({selectedTasks.length} selezionati)
            </label>
            {taskTemplates.length === 0 ? (
              <p className="text-sm text-slate-600 border-2 border-dashed border-slate-300 rounded p-3 text-center font-medium">
                Nessun task template disponibile. Crea prima dei task template.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border-2 border-slate-200 rounded p-3 space-y-2 bg-white">
                {taskTemplates.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-3 p-2 hover:bg-primary-50 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.name)}
                      onChange={() => toggleTaskForMilestone(task.name)}
                      className="rounded border-2 border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-2xl">{task.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-slate-600">{task.description}</div>
                      )}
                    </div>
                    {task.data && task.data.estimated_hours > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-semibold">
                        {task.data.estimated_hours}h
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2 font-medium">
              💡 Questi task verranno creati automaticamente quando si crea un progetto con questa milestone
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
