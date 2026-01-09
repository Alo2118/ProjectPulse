import { useState, useEffect } from 'react';
import { Plus, ChevronRight, CheckCircle, Circle } from 'lucide-react';
import { tasksApi } from '../services/api';
import { Button, Card, StatusBadge, PriorityBadge } from './ui';

export default function SubtaskList({ parentTask, onSubtaskClick, onUpdate }) {
  const [subtasks, setSubtasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
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
        <Button
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="w-4 h-4" />
          Aggiungi Subtask
        </Button>
      </div>

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

      {/* Subtasks List */}
      {subtasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-sm">Nessun subtask ancora creato</p>
          <p className="text-xs mt-1">Suddividi questo task in subtask più piccoli per organizzare meglio il lavoro</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <Card
              key={subtask.id}
              hover
              padding="sm"
              className="cursor-pointer"
              onClick={() => onSubtaskClick && onSubtaskClick(subtask)}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {subtask.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-medium ${subtask.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {subtask.title}
                    </h4>
                    <StatusBadge status={subtask.status} size="sm" />
                    <PriorityBadge priority={subtask.priority} size="sm" />
                  </div>
                  {subtask.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">{subtask.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>Assegnato a: {subtask.assigned_to_name}</span>
                    {subtask.time_spent > 0 && (
                      <span>• {Math.round(subtask.time_spent / 3600)}h</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
