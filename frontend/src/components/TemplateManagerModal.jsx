import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { X, Plus, Edit2, Trash2, Save, Settings } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useTemplates } from '../hooks/useTemplates';

export default function TemplateManagerModal({ type = 'task', onClose, onTemplateSelect }) {
  const { colors, spacing } = useTheme();
  const { error: showError, warning } = useToast();
  const { customTemplates, getAllTemplates, saveCustomTemplate, deleteCustomTemplate } =
    useTemplates(type);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const templates = getAllTemplates().filter((t) => t.id !== 'custom'); // Remove "custom" placeholder
  const builtInTemplates = templates.filter((t) => !t.custom);
  const customTemplatesList = templates.filter((t) => t.custom);

  const handleCreateNew = () => {
    setEditingTemplate({
      name: '',
      description: '',
      icon: '📝',
      custom: true,
      data:
        type === 'task'
          ? { description: '', priority: 'medium', subtasks: [] }
          : type === 'project'
            ? { description: '', milestones: [] }
            : { description: '', duration_days: 30 },
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
      warning('Il nome del template è obbligatorio');
      return;
    }

    try {
      saveCustomTemplate(editingTemplate);
      setEditingTemplate(null);
      setIsCreating(false);
    } catch (error) {
      showError('Errore durante il salvataggio del template');
    }
  };

  const handleDelete = (templateId) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;

    try {
      deleteCustomTemplate(templateId);
    } catch (error) {
      showError("Errore durante l'eliminazione del template");
    }
  };

  const handleAddSubtask = () => {
    if (editingTemplate && type === 'task') {
      setEditingTemplate({
        ...editingTemplate,
        data: {
          ...editingTemplate.data,
          subtasks: [...(editingTemplate.data.subtasks || []), ''],
        },
      });
    }
  };

  const handleRemoveSubtask = (index) => {
    if (editingTemplate && type === 'task') {
      const newSubtasks = editingTemplate.data.subtasks.filter((_, i) => i !== index);
      setEditingTemplate({
        ...editingTemplate,
        data: { ...editingTemplate.data, subtasks: newSubtasks },
      });
    }
  };

  const handleSubtaskChange = (index, value) => {
    if (editingTemplate && type === 'task') {
      const newSubtasks = [...editingTemplate.data.subtasks];
      newSubtasks[index] = value;
      setEditingTemplate({
        ...editingTemplate,
        data: { ...editingTemplate.data, subtasks: newSubtasks },
      });
    }
  };

  const typeLabel = type === 'task' ? 'Task' : type === 'project' ? 'Progetti' : 'Milestone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="card-lg max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <div className={`sticky top-0 flex items-center justify-between border-b-2 ${colors.border} ${colors.bg.secondary} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-cyan-400" />
            <h2 className="card-header">Gestione Template {typeLabel}</h2>
          </div>
          <button onClick={onClose} className="text-cyan-400/60 hover:text-cyan-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {editingTemplate ? (
            /* Edit Mode */
            <div className="space-y-4">
              <div className="mb-4 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 p-4 shadow-sm">
                <div className="mb-1 font-medium text-cyan-300">
                  {isCreating ? '✨ Crea Nuovo Template' : '✏️ Modifica Template'}
                </div>
                <div className={`text-sm ${colors.text.tertiary}`}>
                  {isCreating
                    ? 'Crea un template personalizzato per velocizzare la creazione di nuovi elementi'
                    : 'Modifica il tuo template personalizzato'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-label mb-2 block">Nome Template *</label>
                <input
                  type="text"
                  className="input-dark w-full"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="es. Test Hardware Avanzati"
                  autoFocus
                />
              </div>

              {/* Icon */}
              <div>
                <label className="text-label mb-2 block">Icona (Emoji)</label>
                <input
                  type="text"
                  className="input-dark w-full"
                  value={editingTemplate.icon}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, icon: e.target.value })}
                  placeholder="📋"
                  maxLength={2}
                />
                <p className={`mt-1 text-xs ${colors.text.tertiary}`}>
                  Usa un emoji per identificare visivamente il template
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="text-label mb-2 block">Descrizione Template</label>
                <textarea
                  className="input-dark w-full"
                  rows="2"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  placeholder="Breve descrizione del template..."
                />
              </div>

              {/* Data Description */}
              <div>
                <label className="text-label mb-2 block">
                  Descrizione Dettagliata (apparirà nel campo descrizione)
                </label>
                <textarea
                  className="input-dark w-full"
                  rows="4"
                  value={editingTemplate.data?.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      data: { ...editingTemplate.data, description: e.target.value },
                    })
                  }
                  placeholder="Descrizione completa che apparirà quando usi il template..."
                />
              </div>

              {/* Task-specific fields */}
              {type === 'task' && (
                <>
                  <div>
                    <label className="text-label mb-2 block">Priorità Predefinita</label>
                    <select
                      className="input-dark w-full"
                      value={editingTemplate.data?.priority || 'medium'}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          data: { ...editingTemplate.data, priority: e.target.value },
                        })
                      }
                    >
                      <option value="low">Bassa</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        Subtask / Checklist
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="h-4 w-4" />
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
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm italic ${colors.text.tertiary}`}>
                        Nessuna subtask. Clicca "Aggiungi Subtask" per creare una checklist.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-200 pt-4">
                <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                  <Save className="h-4 w-4" />
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
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Crea Nuovo Template Personalizzato
              </button>

              {/* Custom Templates */}
              {customTemplatesList.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">
                    Template Personalizzati ({customTemplatesList.length})
                  </h3>
                  <div className="space-y-2">
                    {customTemplatesList.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-lg border border-gray-200 p-4 transition-colors hover:border-primary-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-2xl">{template.icon}</span>
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <span className="rounded border border-cyan-500/30 bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
                                Custom
                              </span>
                            </div>
                            <p className={`mb-2 text-sm ${colors.text.tertiary}`}>{template.description}</p>
                            {type === 'task' &&
                              template.data?.subtasks &&
                              template.data.subtasks.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  📋 {template.data.subtasks.length} subtask incluse
                                </p>
                              )}
                          </div>
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleEdit(template)}
                              className="btn-secondary flex items-center gap-1 text-sm"
                              title="Modifica template"
                            >
                              <Edit2 className="h-4 w-4" />
                              Modifica
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="btn-secondary flex items-center gap-1 text-sm text-red-600 hover:bg-red-50"
                              title="Elimina template"
                            >
                              <Trash2 className="h-4 w-4" />
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
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  Template Predefiniti ({builtInTemplates.length})
                </h3>
                <p className="mb-3 text-sm text-gray-600">
                  I template predefiniti non possono essere modificati
                </p>
                <div className="space-y-2">
                  {builtInTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-2xl">{template.icon}</span>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                              Predefinito
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{template.description}</p>
                          {type === 'task' && template.data?.subtasks && (
                            <p className="mt-2 text-xs text-gray-500">
                              📋 {template.data.subtasks.length} subtask incluse
                            </p>
                          )}
                          {type === 'project' && template.data?.milestones && (
                            <p className="mt-2 text-xs text-gray-500">
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
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button onClick={onClose} className="btn-secondary w-full">
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
