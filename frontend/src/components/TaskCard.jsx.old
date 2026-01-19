import {
  Clock,
  MessageSquare,
  Play,
  AlertCircle,
  HelpCircle,
  Calendar,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { 
  getStatusColors, 
  getPriorityColors,
  getPriorityBarColor,
  getPriorityBorderTopColor 
} from '../utils/helpers';
import { timeApi } from '../services/api';

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato',
};

const priorityConfig = {
  low: {
    icon: ArrowDown,
    label: 'Bassa',
  },
  medium: {
    icon: ArrowRight,
    label: 'Media',
  },
  high: {
    icon: ArrowUp,
    label: 'Alta',
  },
};

export default function TaskCard({
  task,
  onClick,
  onTimerStart,
  showProject = true,
  expandButton = null,
  hasSubtasks = false,
}) {
  const { colors } = useTheme();
  const handleStartTimer = async (e) => {
    e.stopPropagation();
    try {
      await timeApi.start(task.id);
      if (onTimerStart) onTimerStart();
    } catch (error) {
      alert(error.response?.data?.error || "Errore durante l'avvio del timer");
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
        urgent: true,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Scade oggi',
        color: 'text-warning-700 bg-warning-50',
        icon: Calendar,
        urgent: true,
      };
    } else if (diffDays <= 3) {
      return {
        text: `Scade tra ${diffDays} gg`,
        color: 'text-warning-600 bg-warning-50',
        icon: Calendar,
        urgent: false,
      };
    } else if (diffDays <= 7) {
      return {
        text: `Scade tra ${diffDays} gg`,
        color: 'text-slate-600 bg-slate-100',
        icon: Calendar,
        urgent: false,
      };
    } else {
      return {
        text: deadline.toLocaleDateString('it-IT'),
        color: 'text-slate-500 bg-slate-50',
        icon: Calendar,
        urgent: false,
      };
    }
  };

  const deadlineInfo = getDeadlineInfo();
  const statusColor = getStatusColors(task.status);
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;
  const priorityColors = getPriorityColors(task.priority);

  const isSubtask = task.parent_task_id;
  const borderTopColor = isSubtask ? getPriorityBorderTopColor(task.priority) : '';

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-xl transition-all ${colors.bg.primary} ${colors.border} border-2 ${colors.text.primary} ${isSubtask ? `card ml-4 ${borderTopColor}` : 'card-lg shadow-md'}`}
    >
      {/* Priority Indicator Bar - diverso per subtask */}
      {!isSubtask && (
        <div
          className={`h-0.5 ${getPriorityBarColor(task.priority)}`}
        />
      )}

      <div className="p-2">
        {/* Header Compatto */}
        <div className="mb-1 flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            {/* Badges compatti in una riga */}
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {/* Project Name compatto - non mostrare se è un subtask */}
              {showProject && !isSubtask && task.project_name && (
                <div className={`inline-flex items-center gap-0.5 rounded border ${colors.border} ${colors.bg.secondary} px-1.5 py-0.5 text-xs ${colors.text.secondary}`}>
                  <span>📁</span>
                  <span className="max-w-[100px] truncate font-medium">{task.project_name}</span>
                </div>
              )}
              <span
                className={`inline-flex items-center rounded px-1.5 py-0 text-xs font-bold ${statusColor.bg} ${statusColor.text} border-2 ${statusColor.border}`}
              >
                {statusLabels[task.status]}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0 text-xs font-bold ${priorityColors.bg} ${priorityColors.text} border-2 ${priorityColors.border}`}
              >
                <priorityInfo.icon className="h-3 w-3" />
              </span>
            </div>

            {/* Task Title più compatto - diverso per subtask */}
            <div className="flex items-start gap-1">
              {/* Expand Button allineato con il titolo */}
              {expandButton && <div className="flex-shrink-0">{expandButton}</div>}
              <h3
                className={`${isSubtask ? 'font-medium' : 'font-semibold'} mb-1 line-clamp-2 flex-1 text-xs leading-normal ${colors.text.primary} transition-colors group-hover:${colors.accent}`}
              >
                {isSubtask && <span className={colors.text.tertiary}>└ </span>}
                {task.title}
              </h3>
            </div>

            {/* Description più compatta (opzionale, solo 1 riga) */}
            {task.description && <p className={`line-clamp-1 text-xs ${colors.text.tertiary}`}></p>}
          </div>

          {/* Timer Button compatto */}
          {task.status !== 'completed' && task.status !== 'blocked' && (
            <button
              onClick={handleStartTimer}
              className="btn-xs btn-primary flex-shrink-0 shadow-sm"
            >
              <Play className="h-3 w-3" />
              <span className="hidden text-xs sm:inline">Start</span>
            </button>
          )}
        </div>

        {/* Footer compatto */}
        {(task.time_spent > 0 ||
          deadlineInfo ||
          task.blocked_reason ||
          task.clarification_needed) && (
          <div className={`mt-1 flex flex-wrap items-center gap-1 border-t-2 ${colors.borderLight} pt-1 text-xs`}>
            {task.time_spent > 0 && (
              <div className={`flex items-center gap-0.5 rounded border ${colors.border} ${colors.bg.secondary} px-1.5 py-0 text-xs ${colors.text.secondary}`}>
                <Clock className="h-2.5 w-2.5" />
                <span className="font-medium">{formatTime(task.time_spent)}</span>
              </div>
            )}

            {deadlineInfo && (
              <div
                className={`flex items-center gap-0.5 rounded px-1.5 py-0 text-xs font-bold ${
                  deadlineInfo.color === 'bg-danger-50 text-danger-700'
                    ? 'border border-red-500/30 bg-red-500/20 text-red-300'
                    : deadlineInfo.color === 'text-warning-700 bg-warning-50'
                      ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                      : deadlineInfo.color === 'bg-warning-50 text-warning-600'
                        ? 'border border-amber-500/30 bg-amber-500/20 text-amber-300'
                        : 'border border-cyan-500/20 bg-slate-700/50 text-slate-400'
                }`}
              >
                <deadlineInfo.icon className="h-2.5 w-2.5" />
                <span>{deadlineInfo.text}</span>
              </div>
            )}

            {task.blocked_reason && (
              <div className="flex items-center gap-0.5 rounded border-2 border-red-500/30 bg-red-500/20 px-1.5 py-0 text-xs font-bold text-red-300">
                <AlertCircle className="h-2.5 w-2.5" />
                <span>Bloccato</span>
              </div>
            )}

            {task.clarification_needed && (
              <div className="flex items-center gap-0.5 rounded border-2 border-amber-500/30 bg-amber-500/20 px-1.5 py-0 text-xs font-bold text-amber-300">
                <HelpCircle className="h-2.5 w-2.5" />
                <span>Chiarimenti</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
