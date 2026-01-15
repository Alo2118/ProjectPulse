import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus, ChevronRight, CheckCircle, Circle, GripVertical, Trash2,
  CheckSquare, ArrowUpCircle, Link2, X, AlertCircle
} from 'lucide-react';
import { tasksApi } from '../services/api';
import { Button, Card, StatusBadge, PriorityBadge } from './ui';

export default function SubtaskList({ parentTask, onSubtaskClick, onUpdate }) {
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
    priority: 'medium'
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
        tasksApi.getSubtasksStats(parentTask.id)
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
        status: 'todo'
      });
      setNewSubtask({ title: '', description: '', priority: 'medium' });
      setShowCreateForm(false);
      loadSubtasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('Errore nella creazione del subtask: ' + (error.response?.data?.error || error.message));
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
      const subtaskIds = items.map(item => item.id);
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
      alert('Errore: ' + (error.response?.data?.error || error.message));
    }
  };

  // Selection
  const handleSelectSubtask = (subtaskId, e) => {
    e.stopPropagation();
    setSelectedSubtasks(prev =>
      prev.includes(subtaskId)
        ? prev.filter(id => id !== subtaskId)
        : [...prev, subtaskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubtasks.length === subtasks.length) {
      setSelectedSubtasks([]);
    } else {
      setSelectedSubtasks(subtasks.map(st => st.id));
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
      alert('Errore: ' + (error.response?.data?.error || error.message));
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
      alert('Errore: ' + (error.response?.data?.error || error.message));
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
      alert('Errore: ' + (error.response?.data?.error || error.message));
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
      alert('Errore: ' + (error.response?.data?.error || error.message));
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
    return (
      <div className="text-center py-4 text-gray-500">
        Caricamento subtask...
      </div>
    );
  }

  const progress = calculateProgress();
  const hasSelection = selectedSubtasks.length > 0;

  return (
    <div className="mt-6 border-t pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChevronRight className="w-5 h-5" />
            Subtask ({stats?.total || 0})
          </h3>
          {stats && stats.total > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
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
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progress}% completato</p>
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
              <CheckSquare className="w-4 h-4" />
              Seleziona
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="w-4 h-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedSubtasks.length === subtasks.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm font-medium">
                {selectedSubtasks.length} selezionati
              </span>
            </div>
            {hasSelection && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="success"
                  onClick={handleBulkComplete}
                >
                  <CheckCircle className="w-4 h-4" />
                  Completa tutti
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <form onSubmit={handleCreateSubtask} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Titolo *</label>
              <input
                type="text"
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Titolo del subtask..."
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea
                value={newSubtask.description}
                onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                className="w-full p-2 border rounded"
                rows="2"
                placeholder="Descrizione opzionale..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priorità</label>
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
                className="w-full p-2 border rounded"
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
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-sm">Nessun subtask ancora creato</p>
          <p className="text-xs mt-1">Suddividi questo task in subtask più piccoli per organizzare meglio il lavoro</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="subtasks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {subtasks.map((subtask, index) => (
                  <Draggable
                    key={subtask.id}
                    draggableId={String(subtask.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        hover={!snapshot.isDragging}
                        padding="sm"
                        className={`cursor-pointer ${
                          snapshot.isDragging ? 'shadow-lg ring-2 ring-primary-500' : ''
                        } ${selectedSubtasks.includes(subtask.id) ? 'ring-2 ring-blue-400' : ''}`}
                        onClick={() => !showBulkActions && onSubtaskClick && onSubtaskClick(subtask)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* Selection Checkbox */}
                          {showBulkActions && (
                            <input
                              type="checkbox"
                              checked={selectedSubtasks.includes(subtask.id)}
                              onChange={(e) => handleSelectSubtask(subtask.id, e)}
                              className="mt-1 w-4 h-4 text-primary-600"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}

                          {/* Complete Checkbox */}
                          <div
                            className="mt-0.5 cursor-pointer"
                            onClick={(e) => handleToggleComplete(subtask, e)}
                          >
                            {subtask.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className={`font-medium ${subtask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {subtask.title}
                              </h4>
                              <StatusBadge status={subtask.status} size="sm" />
                              <PriorityBadge priority={subtask.priority} size="sm" />

                              {/* Dependency indicator */}
                              {subtask.depends_on_task_id && (
                                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                  <Link2 className="w-3 h-3" />
                                  <span>Dipende da: {subtask.depends_on_task_title}</span>
                                  {subtask.depends_on_task_status !== 'completed' && (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                </div>
                              )}
                            </div>

                            {subtask.description && (
                              <p className="text-sm text-gray-600 line-clamp-1 mb-1">{subtask.description}</p>
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
                              className="p-1 text-gray-400 hover:text-primary-600 rounded"
                              title="Imposta dipendenza"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handlePromoteToTask(subtask, e)}
                              className="p-1 text-gray-400 hover:text-green-600 rounded"
                              title="Promuovi a task indipendente"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Imposta Dipendenza
              </h3>
              <button
                onClick={() => {
                  setShowDependencyModal(false);
                  setDependencySubtask(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              "{dependencySubtask.title}" dipende da:
            </p>

            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              <button
                onClick={() => handleSetDependency(null)}
                className="w-full text-left p-2 rounded border hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">
                  Nessuna dipendenza
                </span>
              </button>
              {subtasks
                .filter(st => st.id !== dependencySubtask.id)
                .map(st => (
                  <button
                    key={st.id}
                    onClick={() => handleSetDependency(st.id)}
                    className={`w-full text-left p-2 rounded border hover:bg-gray-50 ${
                      st.id === dependencySubtask.depends_on_task_id ? 'bg-blue-50 border-blue-300' : ''
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
