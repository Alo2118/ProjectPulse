/**
 * TASK CARD - Versione Refactored
 *
 * Questo file mostra come usare il nuovo design system.
 * Confronta con TaskCard.jsx originale per vedere le differenze.
 *
 * PRIMA (hardcode):
 * className="rounded-lg border-2 border-cyan-500/30 bg-slate-800/50 p-4"
 *
 * DOPO (design system):
 * className={cn(theme.card.base, theme.spacing.p.md)}
 */

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
import theme, { cn } from '../styles/theme';
import { timeApi } from '../services/api';
import { useToast } from '../context/ToastContext';

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato',
};

const priorityConfig = {
  low: { icon: ArrowDown, label: 'Bassa' },
  medium: { icon: ArrowRight, label: 'Media' },
  high: { icon: ArrowUp, label: 'Alta' },
};

export default function TaskCard({
  task,
  onClick,
  onTimerStart,
  showProject = true,
  expandButton = null,
  hasSubtasks = false,
}) {
  const { error: showError } = useToast();

  const handleStartTimer = async (e) => {
    e.stopPropagation();
    try {
      await timeApi.start(task.id);
      if (onTimerStart) onTimerStart();
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'avvio del timer");
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
        classes: cn(theme.badge.error, theme.spacing.px.sm, theme.spacing.py.xs),
        icon: AlertCircle,
        urgent: true,
      };
    } else if (diffDays === 0) {
      return {
        text: 'Scade oggi',
        classes: cn(theme.badge.warning, theme.spacing.px.sm, theme.spacing.py.xs),
        icon: Calendar,
        urgent: true,
      };
    } else if (diffDays <= 3) {
      return {
        text: `Scade tra ${diffDays} gg`,
        classes: cn(theme.badge.warning, theme.spacing.px.sm, theme.spacing.py.xs),
        icon: Calendar,
        urgent: false,
      };
    }

    return null;
  };

  const PriorityIcon = priorityConfig[task.priority]?.icon || ArrowRight;
  const deadlineInfo = getDeadlineInfo();

  return (
    <div
      onClick={onClick}
      className={cn(
        theme.card.hover,
        theme.spacing.p.md,
        'cursor-pointer group'
      )}
    >
      {/* Header */}
      <div className={cn(theme.layout.flex.between, theme.spacing.mb.sm)}>
        <div className={theme.layout.flex.start}>
          {/* Status Badge */}
          <span className={theme.badge.status[task.status]}>
            {statusLabels[task.status]}
          </span>

          {/* Priority Badge */}
          <span className={cn(theme.badge.priority[task.priority], 'ml-2')}>
            <PriorityIcon className="w-3 h-3" />
            <span>{priorityConfig[task.priority]?.label}</span>
          </span>
        </div>

        {/* Expand button se ha subtask */}
        {expandButton}
      </div>

      {/* Title */}
      <h3
        className={cn(
          theme.typography.h5,
          theme.spacing.mb.xs,
          'group-hover:text-cyan-200'
        )}
      >
        {task.title}
      </h3>

      {/* Description (se presente) */}
      {task.description && (
        <p className={cn(theme.typography.bodySmall, theme.utils.lineClamp[2], theme.spacing.mb.sm)}>
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className={cn(theme.layout.flex.between, 'mt-4 pt-3 border-t', theme.border.defaultAlpha)}>
        <div className={theme.layout.flex.start}>
          {/* Deadline warning */}
          {deadlineInfo && (
            <span className={deadlineInfo.classes}>
              <deadlineInfo.icon className="w-3 h-3" />
              {deadlineInfo.text}
            </span>
          )}

          {/* Project name */}
          {showProject && task.project_name && (
            <span
              className={cn(
                theme.typography.caption,
                theme.colors.text.muted,
                'ml-2'
              )}
            >
              📁 {task.project_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className={cn(theme.layout.flex.end, theme.spacing.gap.sm)}>
          {/* Time spent */}
          {task.time_spent > 0 && (
            <span
              className={cn(
                theme.layout.flex.start,
                theme.typography.caption,
                theme.colors.text.muted
              )}
            >
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(task.time_spent)}
            </span>
          )}

          {/* Comments count */}
          {task.comments_count > 0 && (
            <span
              className={cn(
                theme.layout.flex.start,
                theme.typography.caption,
                theme.colors.text.muted
              )}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              {task.comments_count}
            </span>
          )}

          {/* Start timer button */}
          {task.status !== 'completed' && (
            <button
              onClick={handleStartTimer}
              className={cn(
                theme.button.ghost,
                theme.button.size.sm,
                'opacity-0 group-hover:opacity-100'
              )}
              aria-label="Avvia timer"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Subtask indicator */}
      {hasSubtasks && (
        <div className={cn('mt-2 pt-2 border-t', theme.border.lightAlpha)}>
          <span className={cn(theme.typography.caption, theme.colors.text.muted)}>
            Contiene sottotask
          </span>
        </div>
      )}
    </div>
  );
}
