import { ChevronDown, ChevronRight, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTheme } from '../hooks/useTheme';
import { getStatusStyleInline } from '../utils/helpers';

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato',
};

const TaskTreeNode = ({
  task,
  subtasks = [],
  onTaskClick,
  onTaskUpdate,
  depth = 0,
  expandedTasks = {},
  onToggleExpand,
}) => {
  const { colors } = useTheme();
  const isExpanded = expandedTasks[task.id] || false;
  const hasSubtasks = subtasks && subtasks.length > 0;

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date() && deadline !== 'completed';
  };

  const isApproaching = (deadline) => {
    if (!deadline) return false;
    const daysUntil = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3 && daysUntil > 0;
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    onToggleExpand(task.id);
  };

  const handleClick = () => {
    onTaskClick && onTaskClick(task);
  };

  const statusColor = getStatusStyleInline(task.status);

  // Priority border colors for left border
  const priorityBorderColor =
    task.priority === 'alta'
      ? '#ef4444'
      : task.priority === 'media'
        ? '#f59e0b'
        : task.priority === 'bassa'
          ? '#3b82f6'
          : '#cbd5e1';

  return (
    <div>
      <div
        onClick={handleClick}
        className="card mb-2 flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all"
        style={{ borderLeftColor: priorityBorderColor, borderLeftWidth: '8px' }}
      >
        <div className="mb-1 flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1 text-xs">
              <span
                className="inline-flex items-center rounded border px-1.5 py-0 text-xs font-medium"
                style={{
                  color: statusColor.color,
                  backgroundColor: statusColor.backgroundColor,
                  borderColor: statusColor.borderColor,
                }}
              >
                {statusLabels[task.status]}
              </span>

              {task.project_name && !task.parent_task_id && (
                <div className="flex items-center gap-0.5 rounded border-2 border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0 font-medium text-cyan-400">
                  <span>📁</span>
                  <span className="max-w-[100px] truncate">{task.project_name}</span>
                </div>
              )}

              {task.assigned_to_name && (
                <div className="flex items-center gap-0.5 rounded border-2 border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0 text-cyan-300">
                  <User className="h-2.5 w-2.5" />
                  <span className="max-w-[70px] truncate">
                    {task.assigned_to_name.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-1 flex items-start gap-0.5">
              <h4
                className={`${task.parent_task_id ? 'font-normal' : 'font-medium'} line-clamp-2 flex-1 text-xs ${colors.text.primary}`}
              >
                {task.parent_task_id && <span className={colors.text.tertiary}>└ </span>}
                {task.title}
              </h4>
            </div>

            {(hasSubtasks || task.deadline || task.total_time_spent > 0) && (
              <div className={`flex flex-wrap items-center gap-1 text-xs ${colors.text.tertiary}`}>
                {hasSubtasks && (
                  <div className="font-medium text-cyan-300">
                    📋 {subtasks.filter((s) => s.status === 'completed').length}/{subtasks.length}
                  </div>
                )}

                {task.deadline && (
                  <div
                    className="flex items-center gap-0.5 rounded border-2 px-1.5 py-0 text-xs"
                    style={{
                      color: isOverdue(task.deadline)
                        ? '#f87171'
                        : isApproaching(task.deadline)
                          ? '#fbbf24'
                          : undefined,
                      backgroundColor: isOverdue(task.deadline)
                        ? '#7f1d1d30'
                        : isApproaching(task.deadline)
                          ? '#78350f30'
                          : '#1e293b50',
                      borderColor: isOverdue(task.deadline)
                        ? '#dc262630'
                        : isApproaching(task.deadline)
                          ? '#d9700630'
                          : '#64748b30',
                      fontWeight: isOverdue(task.deadline) ? '500' : 'normal',
                    }}
                  >
                    <Calendar className="h-2.5 w-2.5" />
                    <span>{format(new Date(task.deadline), 'dd/MM', { locale: it })}</span>
                    {isOverdue(task.deadline) && <AlertCircle className="h-2.5 w-2.5" />}
                  </div>
                )}

                {task.total_time_spent > 0 && (
                  <div className="flex items-center gap-0.5 rounded border-2 border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0 text-xs">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{Math.round(task.total_time_spent / 60)}m</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasSubtasks && (
            <button
              onClick={handleToggleExpand}
              className={`-mt-0.5 flex-shrink-0 rounded p-1 transition-colors ${colors.bg.hover}`}
              title={isExpanded ? 'Comprimi' : 'Espandi'}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <ChevronRight className={`h-3.5 w-3.5 ${colors.text.tertiary}`} />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasSubtasks && (
        <div className="px-2 py-1">
          <div className="space-y-1">
            {subtasks.map((subtask) => {
              const subtaskChildren = subtasks.filter((s) => s.parent_task_id === subtask.id);
              return (
                <TaskTreeNode
                  key={subtask.id}
                  task={subtask}
                  subtasks={subtaskChildren}
                  onTaskClick={onTaskClick}
                  onTaskUpdate={onTaskUpdate}
                  depth={depth + 1}
                  expandedTasks={expandedTasks}
                  onToggleExpand={onToggleExpand}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTreeNode;
