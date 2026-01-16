import { Clock, MessageSquare, Play, AlertCircle, HelpCircle, Calendar, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { timeApi } from '../services/api';

const statusColors = {
  todo: 'bg-slate-100 text-slate-700 border-2 border-slate-200',
  in_progress: 'bg-primary-50 text-primary-700 border-2 border-primary-200',
  blocked: 'bg-danger-50 text-danger-700 border-2 border-danger-200',
  waiting_clarification: 'bg-warning-50 text-warning-700 border-2 border-warning-200',
  completed: 'bg-success-50 text-success-700 border-2 border-success-200'
};

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato'
};

const priorityConfig = {
  low: {
    color: 'text-slate-700 bg-slate-50 border-2 border-slate-200',
    icon: ArrowDown,
    label: 'Bassa'
  },
  medium: {
    color: 'text-warning-700 bg-warning-50 border-2 border-warning-200',
    icon: ArrowRight,
    label: 'Media'
  },
  high: {
    color: 'text-danger-700 bg-danger-50 border-2 border-danger-200',
    icon: ArrowUp,
    label: 'Alta'
  }
};

export default function TaskCard({ task, onClick, onTimerStart, showProject = true, expandButton = null, hasSubtasks = false }) {
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

  const getDeadlineInfo = () => {
    if (!task.deadline || task.status === 'completed') return null;

    const deadline = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `In ritardo di ${Math.abs(diffDays)} gg`,
        color: 'text-danger-700 bg-danger-50',
        icon: AlertCircle,
        urgent: true
      };
    } else if (diffDays === 0) {
      return {
        text: 'Scade oggi',
        color: 'text-warning-700 bg-warning-50',
        icon: Calendar,
        urgent: true
      };
    } else if (diffDays <= 3) {
      return {
        text: `Scade tra ${diffDays} gg`,
        color: 'text-warning-600 bg-warning-50',
        icon: Calendar,
        urgent: false
      };
    } else if (diffDays <= 7) {
      return {
        text: `Scade tra ${diffDays} gg`,
        color: 'text-slate-600 bg-slate-100',
        icon: Calendar,
        urgent: false
      };
    } else {
      return {
        text: deadline.toLocaleDateString('it-IT'),
        color: 'text-slate-500 bg-slate-50',
        icon: Calendar,
        urgent: false
      };
    }
  };

  const deadlineInfo = getDeadlineInfo();
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;

  const isSubtask = task.parent_task_id;
  const borderTopColor = isSubtask ? (
    task.priority === 'high' ? 'border-t-2 border-t-danger-400' :
    task.priority === 'medium' ? 'border-t-2 border-t-warning-400' :
    'border-t-2 border-t-slate-300'
  ) : '';

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer transition-all rounded-xl ${
        isSubtask
          ? `ml-4 card ${borderTopColor}`
          : 'card-lg'
      }`}
    >
      {/* Priority Indicator Bar - diverso per subtask */}
      {!isSubtask && (
        <div className={`h-0.5 ${
          task.priority === 'high' ? 'bg-danger-500' :
          task.priority === 'medium' ? 'bg-warning-500' :
          'bg-slate-400'
        }`} />
      )}
           
      <div className="p-2">
        {/* Header Compatto */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            {/* Badges compatti in una riga */}
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              {/* Project Name compatto - non mostrare se è un subtask */}
              {showProject && !isSubtask && task.project_name && (
                <div className="inline-flex items-center gap-0.5 text-xs text-slate-600 bg-slate-50 rounded px-1.5 py-0.5">
                  <span>📁</span>
                  <span className="font-medium truncate max-w-[100px]">{task.project_name}</span>
                </div>
              )}
              <span className={`inline-flex items-center px-1.5 py-0 rounded text-xs font-bold ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-xs font-bold ${priorityInfo.color}`}>
                <priorityInfo.icon className="w-3 h-3" />
              </span>
            </div>

            {/* Task Title più compatto - diverso per subtask */}
            <div className="flex items-start gap-1">
              {/* Expand Button allineato con il titolo */}
              {expandButton && (
                <div className="flex-shrink-0">
                  {expandButton}
                </div>
              )}
              <h3 className={`${isSubtask ? 'font-medium' : 'font-semibold'} text-slate-900 mb-1 text-xs leading-normal group-hover:text-primary-600 transition-colors line-clamp-2 flex-1`}>
                {isSubtask && <span className="text-slate-500">└ </span>}
                {task.title}
              </h3>
            </div>

            {/* Description più compatta (opzionale, solo 1 riga) */}
            {task.description && (
              <p className="text-xs text-slate-600 line-clamp-1"></p>
            )}
          </div>

          {/* Timer Button compatto */}
          {task.status !== 'completed' && task.status !== 'blocked' && (
            <button
              onClick={handleStartTimer}
              className="btn-primary btn-xs shadow-sm flex-shrink-0"
            >
              <Play className="w-3 h-3" />
              <span className="hidden sm:inline text-xs">Start</span>
            </button>
          )}
        </div>

        {/* Footer compatto */}
        {(task.time_spent > 0 || deadlineInfo || task.blocked_reason || task.clarification_needed) && (
          <div className="flex items-center gap-1 text-xs pt-1 border-t-2 border-slate-200 flex-wrap mt-1">
            {task.time_spent > 0 && (
              <div className="flex items-center gap-0.5 text-slate-600 bg-slate-50 px-1.5 py-0 rounded text-xs">
                <Clock className="w-2.5 h-2.5" />
                <span className="font-medium">{formatTime(task.time_spent)}</span>
              </div>
            )}

            {deadlineInfo && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0 rounded font-bold text-xs ${deadlineInfo.color}`}>
                <deadlineInfo.icon className="w-2.5 h-2.5" />
                <span>{deadlineInfo.text}</span>
              </div>
            )}

            {task.blocked_reason && (
              <div className="flex items-center gap-0.5 text-danger-700 bg-danger-50 px-1.5 py-0 rounded font-bold text-xs border-2 border-danger-200">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Bloccato</span>
              </div>
            )}

            {task.clarification_needed && (
              <div className="flex items-center gap-0.5 text-warning-700 bg-warning-50 px-1.5 py-0 rounded font-bold text-xs border-2 border-warning-200">
                <HelpCircle className="w-2.5 h-2.5" />
                <span>Chiarimenti</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
