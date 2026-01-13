import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, Save, X, FileText, FolderOpen, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { templatesApi } from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function TemplateManagerPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]); // For milestone and project editors
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
      setTaskTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
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
          milestones: []
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
          tasks: []
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestione Template</h1>
          <p className="text-gray-600">
            Crea e gestisci template riutilizzabili per progetti, task e milestone
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600 font-semibold`
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                {tab.label}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {templates.filter(t => t.type === tab.id).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => handleCreate(activeTab)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Nuovo Template {tabs.find(t => t.id === activeTab)?.label}
          </button>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">{tabs.find(t => t.id === activeTab)?.icon && '📋'}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun template trovato
            </h3>
            <p className="text-gray-600 mb-4">
              Crea il tuo primo template per iniziare
            </p>
            <button
              onClick={() => handleCreate(activeTab)}
              className="btn btn-primary"
            >
              Crea Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{template.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.is_public && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Pubblico
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Template Details */}
                <div className="mb-4 text-sm text-gray-500">
                  {template.type === 'project' && template.data?.milestones && (
                    <div>📊 {template.data.milestones.length} milestone</div>
                  )}
                  {template.type === 'task' && (
                    <div>
                      ⏱️ {template.data?.estimated_hours || 0}h
                      {template.data?.subtasks && ` • ${template.data.subtasks.length} subtask`}
                    </div>
                  )}
                  {template.type === 'milestone' && template.data?.duration_days && (
                    <div>📅 {template.data.duration_days} giorni</div>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Creato da: {template.created_by_name || 'N/A'}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 btn btn-secondary text-sm"
                    disabled={template.created_by !== user?.id}
                  >
                    <Edit2 size={16} />
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="btn btn-secondary text-sm"
                    title="Duplica template"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="btn btn-danger text-sm"
                    disabled={template.created_by !== user?.id}
                    title="Elimina template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {selectedTemplate ? 'Modifica Template' : 'Nuovo Template'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Template *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Descrizione */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descrizione
                    </label>
                    <textarea
                      className="input"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icona (emoji)
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="📋"
                    />
                  </div>

                  {/* Public/Private */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_public" className="text-sm text-gray-700">
                      Template pubblico (visibile a tutti gli utenti)
                    </label>
                  </div>

                  {/* Type-specific fields */}
                  <TemplateDataEditor
                    type={formData.type}
                    data={formData.data}
                    onChange={(newData) => setFormData({ ...formData, data: newData })}
                    taskTemplates={taskTemplates}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn btn-secondary"
                  >
                    Annulla
                  </button>
                  <button type="submit" className="flex-1 btn btn-primary flex items-center justify-center gap-2">
                    <Save size={20} />
                    {selectedTemplate ? 'Salva Modifiche' : 'Crea Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for editing template-specific data
function TemplateDataEditor({ type, data, onChange, taskTemplates = [] }) {
  const [expandedMilestones, setExpandedMilestones] = useState({});

  const toggleMilestone = (index) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const addMilestone = () => {
    const milestones = data.milestones || [];
    onChange({
      ...data,
      milestones: [
        ...milestones,
        {
          name: '',
          description: '',
          duration_days: 30,
          tasks: []
        }
      ]
    });
    // Expand the newly added milestone
    setExpandedMilestones(prev => ({ ...prev, [milestones.length]: true }));
  };

  const updateMilestone = (index, field, value) => {
    const milestones = [...(data.milestones || [])];
    milestones[index] = { ...milestones[index], [field]: value };
    onChange({ ...data, milestones });
  };

  const removeMilestone = (index) => {
    const milestones = [...(data.milestones || [])];
    milestones.splice(index, 1);
    onChange({ ...data, milestones });
  };

  const toggleTask = (milestoneIndex, taskName) => {
    const milestones = [...(data.milestones || [])];
    const milestone = { ...milestones[milestoneIndex] };
    const tasks = milestone.tasks || [];

    if (tasks.includes(taskName)) {
      milestone.tasks = tasks.filter(t => t !== taskName);
    } else {
      milestone.tasks = [...tasks, taskName];
    }

    milestones[milestoneIndex] = milestone;
    onChange({ ...data, milestones });
  };

  if (type === 'project') {
    const milestones = data.milestones || [];

    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">Dati Progetto</h4>
          <button
            type="button"
            onClick={addMilestone}
            className="btn btn-secondary text-sm flex items-center gap-1"
          >
            <Plus size={16} />
            Aggiungi Milestone
          </button>
        </div>

        <div className="space-y-3">
          {/* Descrizione generale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione Progetto
            </label>
            <textarea
              className="input"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione generale del progetto..."
            />
          </div>

          {/* Milestone list */}
          {milestones.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed rounded">
              Nessuna milestone definita. Clicca "Aggiungi Milestone" per iniziare.
            </div>
          ) : (
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <div key={index} className="border rounded bg-white">
                  {/* Milestone header */}
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleMilestone(index)}>
                    <div className="flex items-center gap-2 flex-1">
                      {expandedMilestones[index] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="font-medium">{milestone.name || `Milestone ${index + 1}`}</span>
                      <span className="text-xs text-gray-500">({milestone.duration_days || 0} giorni)</span>
                      {milestone.tasks && milestone.tasks.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {milestone.tasks.length} task
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeMilestone(index); }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Elimina milestone"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Milestone details (expanded) */}
                  {expandedMilestones[index] && (
                    <div className="p-3 border-t space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                        <input
                          type="text"
                          className="input text-sm"
                          value={milestone.name || ''}
                          onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                          placeholder="Es: Ricerca e Concept"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Descrizione</label>
                        <textarea
                          className="input text-sm"
                          rows="2"
                          value={milestone.description || ''}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          placeholder="Descrizione della milestone..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Durata (giorni)</label>
                        <input
                          type="number"
                          min="1"
                          className="input text-sm"
                          value={milestone.duration_days || 30}
                          onChange={(e) => updateMilestone(index, 'duration_days', parseInt(e.target.value) || 30)}
                        />
                      </div>

                      {/* Task selector */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Task da Creare ({(milestone.tasks || []).length} selezionati)
                        </label>
                        {taskTemplates.length === 0 ? (
                          <p className="text-xs text-gray-500">Nessun task template disponibile</p>
                        ) : (
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                            {taskTemplates.map((task) => (
                              <label key={task.id} className="flex items-center gap-2 text-sm hover:bg-gray-100 p-1 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(milestone.tasks || []).includes(task.name)}
                                  onChange={() => toggleTask(index, task.name)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-lg">{task.icon}</span>
                                <span className="flex-1">{task.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'task') {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-3">Dati Task</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione Task
            </label>
            <textarea
              className="input"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorità
              </label>
              <select
                className="input"
                value={data.priority || 'medium'}
                onChange={(e) => onChange({ ...data, priority: e.target.value })}
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ore Stimate
              </label>
              <input
                type="number"
                min="0"
                className="input"
                value={data.estimated_hours || 0}
                onChange={(e) => onChange({ ...data, estimated_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtask (uno per riga)
            </label>
            <textarea
              className="input"
              rows="5"
              value={(data.subtasks || []).join('\n')}
              onChange={(e) => onChange({ ...data, subtasks: e.target.value.split('\n').filter(s => s.trim()) })}
              placeholder="Prepara ambiente di test&#10;Esegui test funzionali&#10;Documenta risultati"
            />
            <p className="text-xs text-gray-500 mt-1">
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
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-3">Dati Milestone</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione Milestone
            </label>
            <textarea
              className="input"
              rows="2"
              value={data.description || ''}
              onChange={(e) => onChange({ ...data, description: e.target.value })}
              placeholder="Descrizione della milestone..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durata (giorni)
            </label>
            <input
              type="number"
              min="1"
              className="input"
              value={data.duration_days || 30}
              onChange={(e) => onChange({ ...data, duration_days: parseInt(e.target.value) || 30 })}
            />
          </div>

          {/* Task selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task da Creare ({selectedTasks.length} selezionati)
            </label>
            {taskTemplates.length === 0 ? (
              <p className="text-sm text-gray-500 border-2 border-dashed rounded p-3 text-center">
                Nessun task template disponibile. Crea prima dei task template.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded p-3 space-y-2 bg-white">
                {taskTemplates.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.includes(task.name)}
                      onChange={() => toggleTaskForMilestone(task.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-2xl">{task.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-gray-500">{task.description}</div>
                      )}
                    </div>
                    {task.data && task.data.estimated_hours > 0 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {task.data.estimated_hours}h
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              💡 Questi task verranno creati automaticamente quando si crea un progetto con questa milestone
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
