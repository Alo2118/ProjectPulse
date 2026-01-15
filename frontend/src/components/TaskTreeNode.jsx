import { ChevronDown, ChevronRight, Clock, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const statusLabels = {
  todo: 'Da fare',
  in_progress: 'In corso',
  blocked: 'Bloccato',
  waiting_clarification: 'Attesa chiarimenti',
  completed: 'Completato'
};

const TaskTreeNode = ({ 
  task, 
  subtasks = [], 
  onTaskClick, 
  onTaskUpdate,
  depth = 0,
  expandedTasks = {},
  onToggleExpand
}) => {
  const isExpanded = expandedTasks[task.id] || false;
  const hasSubtasks = subtasks && subtasks.length > 0;

  const getPriorityColor = (priority) => {
    const colors = {
      bassa: 'text-slate-500',
      media: 'text-primary-600',
      alta: 'text-danger-700',
      critica: 'text-slate-900'
    };
    return colors[priority] || 'text-slate-500';
  };

  const getStatusStyle = (status) => {
    const styles = {
      todo: { color: '#475569', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
      in_progress: { color: '#0369a1', backgroundColor: '#ecf0fe', borderColor: '#93c5fd' },
      blocked: { color: '#dc2626', backgroundColor: '#fee2e2', borderColor: '#fecaca' },
      waiting_clarification: { color: '#d97706', backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
      completed: { color: '#16a34a', backgroundColor: '#f0fdf4', borderColor: '#86efac' }
    };
    return styles[status] || styles.todo;
  };

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

  const statusStyle = getStatusStyle(task.status);
  const borderColor = task.priority === 'high' ? '#ef4444' : 
                      task.priority === 'medium' ? '#f59e0b' :
                      task.priority === 'low' ? '#3b82f6' : '#cbd5e1';

  return (
    <div>
      <div
        onClick={handleClick}
        className="p-2 rounded-lg mb-2 cursor-pointer transition-all bg-white shadow-sm hover:shadow-md border-l-4"
        style={{ borderLeftColor: borderColor }}
      >
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs mb-1 flex-wrap">
              <span 
                className="inline-flex items-center px-1.5 py-0 rounded text-xs font-medium border"
                style={{
                  color: statusStyle.color,
                  backgroundColor: statusStyle.backgroundColor,
                  borderColor: statusStyle.borderColor
                }}
              >
                {statusLabels[task.status]}
              </span>

              {task.project_name && !task.parent_task_id && (
                <div className="flex items-center gap-0.5 text-slate-600 font-medium bg-slate-100 px-1.5 py-0 rounded">
                  <span>📁</span>
                  <span className="truncate max-w-[100px]">{task.project_name}</span>
                </div>
              )}

              {task.assigned_to_name && (
                <div className="flex items-center gap-0.5 text-primary-600 bg-primary-50 px-1.5 py-0 rounded">
                  <User className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[70px]">{task.assigned_to_name.split(' ')[0]}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-0.5 mb-1">
              <h4 className={`${task.parent_task_id ? 'font-normal' : 'font-medium'} text-xs text-slate-800 line-clamp-2 flex-1`}>
                {task.parent_task_id && <span className="text-slate-400">└ </span>}
                {task.title}
              </h4>
            </div>

            {(hasSubtasks || task.deadline || task.total_time_spent > 0) && (
              <div className="flex items-center gap-1 text-xs text-slate-500 flex-wrap">
                {hasSubtasks && (
                  <div className="text-primary-600 font-medium">
                    📋 {subtasks.filter(s => s.status === 'completed').length}/{subtasks.length}
                  </div>
                )}

                {task.deadline && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0 rounded text-xs" style={{
                    color: isOverdue(task.deadline) ? '#dc2626' : isApproaching(task.deadline) ? '#d97706' : undefined,
                    backgroundColor: isOverdue(task.deadline) ? '#fee2e2' : isApproaching(task.deadline) ? '#fef3c7' : '#f1f5f9',
                    fontWeight: isOverdue(task.deadline) ? '500' : 'normal'
                  }}>
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{format(new Date(task.deadline), 'dd/MM', { locale: it })}</span>
                    {isOverdue(task.deadline) && <AlertCircle className="w-2.5 h-2.5" />}
                  </div>
                )}

                {task.total_time_spent > 0 && (
                  <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0 rounded text-xs">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{Math.round(task.total_time_spent / 60)}m</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasSubtasks && (
            <button
              onClick={handleToggleExpand}
              className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors -mt-0.5"
              title={isExpanded ? 'Comprimi' : 'Espandi'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-primary-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasSubtasks && (
        <div className="px-2 py-1">
          <div className="space-y-1">
            {subtasks.map(subtask => {
              const subtaskChildren = subtasks.filter(s => s.parent_task_id === subtask.id);
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
