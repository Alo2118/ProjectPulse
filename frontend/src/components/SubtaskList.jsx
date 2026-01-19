import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus,
  ChevronRight,
  CheckCircle,
  Circle,
  GripVertical,
  Trash2,
  CheckSquare,
  ArrowUpCircle,
  Link2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { tasksApi } from '../services/api';
import { Button, Card, StatusBadge, PriorityBadge } from './ui';
import { useToast } from '../context/ToastContext';

export default function SubtaskList({ parentTask, onSubtaskClick, onUpdate }) {
  const { colors, spacing } = useTheme();
  const { error: showError } = useToast();
  const [subtasks, setSubtasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSubtasks, setSelectedSubtasks] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [dependencySubtask, setDependencySubtask] = useState(null);

  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (parentTask && parentTask.id) {
      loadSubtasks();
    }
  }, [parentTask?.id]);

  const loadSubtasks = async () => {
    if (!parentTask || !parentTask.id) return;

    try {
      setLoading(true);
      const [subtasksRes, statsRes] = await Promise.all([
        tasksApi.getSubtasks(parentTask.id),
        tasksApi.getSubtasksStats(parentTask.id),
      ]);
      setSubtasks(subtasksRes.data);
      setStats(statsRes.data);
      setSelectedSubtasks([]);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    if (!parentTask || !parentTask.id) return;

    try {
      await tasksApi.create({
        ...newSubtask,
        parent_task_id: parentTask.id,
        project_id: parentTask.project_id || null,
        assigned_to: parentTask.assigned_to,
        status: 'todo',
      });
      setNewSubtask({ title: '', description: '', priority: 'medium' });
      setShowCreateForm(false);
      loadSubtasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      showError(
        'Errore nella creazione del subtask: ' + (error.response?.data?.error || error.message)
      );
    }
  };

  // Drag & Drop handler
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(subtasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSubtasks(items);

    try {
      const subtaskIds = items.map((item) => item.id);
      await tasksApi.reorderSubtasks(parentTask.id, subtaskIds);
    } catch (error) {
      console.error('Error reordering subtasks:', error);
      loadSubtasks(); // Reload on error
    }
  };

  // Quick toggle complete
  const handleToggleComplete = async (subtask, e) => {
    e.stopPropagation();
    try {
      await tasksApi.toggleComplete(subtask.id);
      loadSubtasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      showError('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  // Selection
  const handleSelectSubtask = (subtaskId, e) => {
    e.stopPropagation();
    setSelectedSubtasks((prev) =>
      prev.includes(subtaskId) ? prev.filter((id) => id !== subtaskId) : [...prev, subtaskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubtasks.length === subtasks.length) {
      setSelectedSubtasks([]);
    } else {
      setSelectedSubtasks(subtasks.map((st) => st.id));
    }
  };

  // Bulk actions
  const handleBulkComplete = async () => {
    if (!confirm(`Completare ${selectedSubtasks.length} subtask?`)) return;

    try {
      await tasksApi.bulkCompleteSubtasks(parentTask.id);
      loadSubtasks();
      if (onUpdate) onUpdate();
      setSelectedSubtasks([]);
      setShowBulkActions(false);
    } catch (error) {
      showError('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Eliminare ${selectedSubtasks.length} subtask selezionati?`)) return;

    try {
      await tasksApi.bulkDeleteSubtasks(parentTask.id, selectedSubtasks);
      loadSubtasks();
      if (onUpdate) onUpdate();
      setSelectedSubtasks([]);
      setShowBulkActions(false);
    } catch (error) {
      showError('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  // Promote subtask to independent task
  const handlePromoteToTask = async (subtask, e) => {
    e.stopPropagation();
    if (!confirm(`Promuovere "${subtask.title}" a task indipendente?`)) return;

    try {
      await tasksApi.promoteToTask(subtask.id);
      loadSubtasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      showError('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  // Set dependency
  const handleSetDependency = async (dependsOnTaskId) => {
    if (!dependencySubtask) return;

    try {
      await tasksApi.setDependency(dependencySubtask.id, dependsOnTaskId);
      loadSubtasks();
      setShowDependencyModal(false);
      setDependencySubtask(null);
    } catch (error) {
      showError('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  const calculateProgress = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  // Early return if no parent task
  if (!parentTask) {
    return null;
  }

  if (loading) {
    return <div className="py-4 text-center text-gray-500">Caricamento subtask...</div>;
  }

  const progress = calculateProgress();
  const hasSelection = selectedSubtasks.length > 0;

  return (
    <div className="mt-6 border-t pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ChevronRight className="h-5 w-5" />
            Subtask ({stats?.total || 0})
          </h3>
          {stats && stats.total > 0 && (
            <div className="mt-2">
              <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
                <span>{stats.completed} completati</span>
                <span>•</span>
                <span>{stats.in_progress} in corso</span>
                {stats.blocked > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-600">{stats.blocked} bloccati</span>
                  </>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{progress}% completato</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {subtasks.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowBulkActions(!showBulkActions)}
            >
              <CheckSquare className="h-4 w-4" />
              Seleziona
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="mb-4 border-2 border-blue-200 bg-blue-50 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedSubtasks.length === subtasks.length}
                onChange={handleSelectAll}
                className="h-4 w-4 text-primary-600"
              />
              <span className="text-sm font-medium">{selectedSubtasks.length} selezionati</span>
            </div>
            {hasSelection && (
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={handleBulkComplete}>
                  <CheckCircle className="h-4 w-4" />
                  Completa tutti
                </Button>
                <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-4 border-2 border-blue-200 bg-blue-50 shadow-md">
          <form onSubmit={handleCreateSubtask} className="space-y-3">
            <div>
              <label className="text-label mb-1 block">Titolo *</label>
              <input
                type="text"
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                className="input-dark w-full"
                placeholder="Titolo del subtask..."
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-label mb-1 block">Descrizione</label>
              <textarea
                value={newSubtask.description}
                onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                className="textarea-dark w-full"
                rows="2"
                placeholder="Descrizione opzionale..."
              />
            </div>
            <div>
              <label className="text-label mb-1 block">Priorità</label>
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
                className="input-dark w-full"
              >
                <option value="low">Bassa</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Crea Subtask
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateForm(false)}
              >
                Annulla
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Subtasks List with Drag & Drop */}
      {subtasks.length === 0 ? (
        <div className="rounded-lg bg-gray-50 py-8 text-center text-gray-500">
          <p className="text-sm">Nessun subtask ancora creato</p>
          <p className="mt-1 text-xs">
            Suddividi questo task in subtask più piccoli per organizzare meglio il lavoro
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="subtasks">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {subtasks.map((subtask, index) => (
                  <Draggable key={subtask.id} draggableId={String(subtask.id)} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        hover={!snapshot.isDragging}
                        padding="sm"
                        className={`cursor-pointer ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
                        } ${selectedSubtasks.includes(subtask.id) ? 'ring-2 ring-blue-400' : ''}`}
                        onClick={() =>
                          !showBulkActions && onSubtaskClick && onSubtaskClick(subtask)
                        }
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="mt-0.5 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>

                          {/* Selection Checkbox */}
                          {showBulkActions && (
                            <input
                              type="checkbox"
                              checked={selectedSubtasks.includes(subtask.id)}
                              onChange={(e) => handleSelectSubtask(subtask.id, e)}
                              className="mt-1 h-4 w-4 text-primary-600"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}

                          {/* Complete Checkbox */}
                          <div
                            className="mt-0.5 cursor-pointer"
                            onClick={(e) => handleToggleComplete(subtask, e)}
                          >
                            {subtask.status === 'completed' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h4
                                className={`font-medium ${subtask.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                              >
                                {subtask.title}
                              </h4>
                              <StatusBadge status={subtask.status} size="sm" />
                              <PriorityBadge priority={subtask.priority} size="sm" />

                              {/* Dependency indicator */}
                              {subtask.depends_on_task_id && (
                                <div className="flex items-center gap-1 rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-600">
                                  <Link2 className="h-3 w-3" />
                                  <span>Dipende da: {subtask.depends_on_task_title}</span>
                                  {subtask.depends_on_task_status !== 'completed' && (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                </div>
                              )}
                            </div>

                            {subtask.description && (
                              <p className="mb-1 line-clamp-1 text-sm text-gray-600">
                                {subtask.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Assegnato a: {subtask.assigned_to_name}</span>
                              {subtask.time_spent > 0 && (
                                <span>• {Math.round(subtask.time_spent / 3600)}h</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDependencySubtask(subtask);
                                setShowDependencyModal(true);
                              }}
                              className="rounded p-1 text-gray-400 hover:text-primary-600"
                              title="Imposta dipendenza"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handlePromoteToTask(subtask, e)}
                              className="rounded p-1 text-gray-400 hover:text-green-600"
                              title="Promuovi a task indipendente"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Dependency Modal */}
      {showDependencyModal && dependencySubtask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="card w-full max-w-md p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Imposta Dipendenza</h3>
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setDependencySubtask(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">"{dependencySubtask.title}" dipende da:</p>

            <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
              <button
                onClick={() => handleSetDependency(null)}
                className="w-full rounded border p-2 text-left hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Nessuna dipendenza</span>
              </button>
              {subtasks
                .filter((st) => st.id !== dependencySubtask.id)
                .map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSetDependency(st.id)}
                    className={`w-full rounded border p-2 text-left hover:bg-gray-50 ${
                      st.id === dependencySubtask.depends_on_task_id
                        ? 'border-blue-300 bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{st.title}</span>
                      <StatusBadge status={st.status} size="sm" />
                    </div>
                  </button>
                ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowDependencyModal(false);
                  setDependencySubtask(null);
                }}
              >
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
