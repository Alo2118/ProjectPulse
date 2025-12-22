import { Clock, MessageSquare, Play, AlertCircle, HelpCircle } from 'lucide-react';
import { timeApi } from '../services/api';

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  waiting_clarification: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800'
};

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato'
};

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-yellow-500',
  high: 'text-red-500'
};

export default function TaskCard({ task, onClick, onTimerStart, showProject = true }) {
  const handleStartTimer = async (e) => {
    e.stopPropagation();
    try {
      await timeApi.start(task.id);
      if (onTimerStart) onTimerStart();
    } catch (error) {
      alert(error.response?.data?.error || 'Errore durante l\'avvio del timer');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div
      onClick={onClick}
      className="card hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
              {task.priority === 'high' && '⬆ Alta'}
              {task.priority === 'medium' && '➡ Media'}
              {task.priority === 'low' && '⬇ Bassa'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
          {showProject && task.project_name && (
            <p className="text-sm text-gray-500 mb-2">📁 {task.project_name}</p>
          )}
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
        </div>

        {task.status !== 'completed' && task.status !== 'blocked' && (
          <button
            onClick={handleStartTimer}
            className="btn-primary flex items-center gap-1 text-sm ml-4"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 pt-3 border-t border-gray-100">
        {task.time_spent > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(task.time_spent)}
          </div>
        )}

        {task.blocked_reason && (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            Bloccato
          </div>
        )}

        {task.clarification_needed && (
          <div className="flex items-center gap-1 text-yellow-600">
            <HelpCircle className="w-4 h-4" />
            Chiarimenti
          </div>
        )}
      </div>
    </div>
  );
}
