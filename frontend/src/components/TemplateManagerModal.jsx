import { useState } from 'react';
import { X, Plus, Edit2, Trash2, Save, Settings } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';

export default function TemplateManagerModal({ type = 'task', onClose, onTemplateSelect }) {
  const { customTemplates, getAllTemplates, saveCustomTemplate, deleteCustomTemplate } = useTemplates(type);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const templates = getAllTemplates().filter(t => t.id !== 'custom'); // Remove "custom" placeholder
  const builtInTemplates = templates.filter(t => !t.custom);
  const customTemplatesList = templates.filter(t => t.custom);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: '',
      description: '',
      icon: '📝',
      custom: true,
      data: type === 'task'
        ? { description: '', priority: 'medium', subtasks: [] }
        : type === 'project'
        ? { description: '', milestones: [] }
        : { description: '', duration_days: 30 }
    });
    setIsCreating(true);
  };

  const handleEdit = (template) => {
    if (template.custom) {
      setEditingTemplate({ ...template });
      setIsCreating(false);
    }
  };

  const handleSave = () => {
    if (!editingTemplate.name.trim()) {
      alert('Il nome del template è obbligatorio');
      return;
    }

    try {
      saveCustomTemplate(editingTemplate);
      setEditingTemplate(null);
      setIsCreating(false);
    } catch (error) {
      alert('Errore durante il salvataggio del template');
    }
  };

  const handleDelete = (templateId) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;

    try {
      deleteCustomTemplate(templateId);
    } catch (error) {
      alert('Errore durante l\'eliminazione del template');
    }
  };

  const handleAddSubtask = () => {
    if (editingTemplate && type === 'task') {
      setEditingTemplate({
        ...editingTemplate,
        data: {
          ...editingTemplate.data,
          subtasks: [...(editingTemplate.data.subtasks || []), '']
        }
      });
    }
  };

  const handleRemoveSubtask = (index) => {
    if (editingTemplate && type === 'task') {
      const newSubtasks = editingTemplate.data.subtasks.filter((_, i) => i !== index);
      setEditingTemplate({
        ...editingTemplate,
        data: { ...editingTemplate.data, subtasks: newSubtasks }
      });
    }
  };

  const handleSubtaskChange = (index, value) => {
    if (editingTemplate && type === 'task') {
      const newSubtasks = [...editingTemplate.data.subtasks];
      newSubtasks[index] = value;
      setEditingTemplate({
        ...editingTemplate,
        data: { ...editingTemplate.data, subtasks: newSubtasks }
      });
    }
  };

  const typeLabel = type === 'task' ? 'Task' : type === 'project' ? 'Progetti' : 'Milestone';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-slate-200">
        <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-bold text-gray-900">Gestione Template {typeLabel}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {editingTemplate ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 mb-4 shadow-sm">
                <div className="font-medium text-primary-900 mb-1">
                  {isCreating ? '✨ Crea Nuovo Template' : '✏️ Modifica Template'}
                </div>
                <div className="text-sm text-primary-700">
                  {isCreating
                    ? 'Crea un template personalizzato per velocizzare la creazione di nuovi elementi'
                    : 'Modifica il tuo template personalizzato'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Template *
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="es. Test Hardware Avanzati"
                  autoFocus
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icona (Emoji)
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingTemplate.icon}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, icon: e.target.value })}
                  placeholder="📋"
                  maxLength={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa un emoji per identificare visivamente il template
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione Template
                </label>
                <textarea
                  className="input"
                  rows="2"
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="Breve descrizione del template..."
                />
              </div>

              {/* Data Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione Dettagliata (apparirà nel campo descrizione)
                </label>
                <textarea
                  className="input"
                  rows="4"
                  value={editingTemplate.data?.description || ''}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    data: { ...editingTemplate.data, description: e.target.value }
                  })}
                  placeholder="Descrizione completa che apparirà quando usi il template..."
                />
              </div>

              {/* Task-specific fields */}
              {type === 'task' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorità Predefinita
                    </label>
                    <select
                      className="input"
                      value={editingTemplate.data?.priority || 'medium'}
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        data: { ...editingTemplate.data, priority: e.target.value }
                      })}
                    >
                      <option value="low">Bassa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Subtask / Checklist
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Aggiungi Subtask
                      </button>
                    </div>

                    {editingTemplate.data?.subtasks && editingTemplate.data.subtasks.length > 0 ? (
                      <div className="space-y-2">
                        {editingTemplate.data.subtasks.map((subtask, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              className="input flex-1"
                              value={subtask}
                              onChange={(e) => handleSubtaskChange(index, e.target.value)}
                              placeholder={`Subtask ${index + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(index)}
                              className="btn-secondary text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Nessuna subtask. Clicca "Aggiungi Subtask" per creare una checklist.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salva Template
                </button>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsCreating(false);
                  }}
                  className="btn-secondary"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            /* List Mode */
            <div className="space-y-6">
              {/* Create New Button */}
              <button
                onClick={handleCreateNew}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crea Nuovo Template Personalizzato
              </button>

              {/* Custom Templates */}
              {customTemplatesList.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Template Personalizzati ({customTemplatesList.length})
                  </h3>
                  <div className="space-y-2">
                    {customTemplatesList.map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{template.icon}</span>
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded">
                                Custom
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {template.description}
                            </p>
                            {type === 'task' && template.data?.subtasks && template.data.subtasks.length > 0 && (
                              <p className="text-xs text-gray-500">
                                📋 {template.data.subtasks.length} subtask incluse
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(template)}
                              className="btn-secondary flex items-center gap-1 text-sm"
                              title="Modifica template"
                            >
                              <Edit2 className="w-4 h-4" />
                              Modifica
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="btn-secondary text-red-600 hover:bg-red-50 flex items-center gap-1 text-sm"
                              title="Elimina template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in Templates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Template Predefiniti ({builtInTemplates.length})
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  I template predefiniti non possono essere modificati
                </p>
                <div className="space-y-2">
                  {builtInTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{template.icon}</span>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                              Predefinito
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {template.description}
                          </p>
                          {type === 'task' && template.data?.subtasks && (
                            <p className="text-xs text-gray-500 mt-2">
                              📋 {template.data.subtasks.length} subtask incluse
                            </p>
                          )}
                          {type === 'project' && template.data?.milestones && (
                            <p className="text-xs text-gray-500 mt-2">
                              🎯 {template.data.milestones.length} milestone incluse
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {!editingTemplate && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button onClick={onClose} className="btn-secondary w-full">
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
