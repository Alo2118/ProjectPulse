import { useState } from 'react';
import TaskCard from './TaskCard';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const TaskTreeList = ({
  tasks = [],
  allTasks = null,
  onTaskClick,
  onTimerStart,
  showProject = true,
  showGrid = false,
}) => {
  const { colors } = useTheme();
  const [expandedTasks, setExpandedTasks] = useState({});

  // Filtra solo i task root (senza parent)
  const sourceTasks = allTasks || tasks;

  // Considera come root tutto ciò che non ha un parent (null/undefined/'')
  const rootTasks = tasks.filter(
    (task) => task.parent_task_id == null || task.parent_task_id === ''
  );

  // Ottieni tutti i subtask di un task
  const getSubtasks = (task) => {
    // Subtask espliciti dentro il task (se l'API li fornisce)
    const embedded = Array.isArray(task.subtasks) ? task.subtasks : [];

    // Subtask presenti nella lista (tipi allineati). Usa allTasks se fornito, altrimenti il subset tasks.
    const targetId = String(task.id);
    const fromList = sourceTasks.filter(
      (t) => t.parent_task_id != null && String(t.parent_task_id) === targetId
    );

    // Unisci evitando duplicati per id
    const seen = new Set();
    return [...embedded, ...fromList].filter((st) => {
      if (!st || st.id == null) return false;
      const key = String(st.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleToggleExpand = (taskId) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const renderTaskWithSubtasks = (task, level = 0) => {
    const isExpanded = expandedTasks[task.id] || false;
    const subtasks = getSubtasks(task);
    const hasSubtasks = subtasks.length > 0;

    const expandButton = hasSubtasks ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleExpand(task.id);
        }}
        className={`flex-shrink-0 rounded p-1 transition-colors ${colors.bg.hover}`}
        title={isExpanded ? 'Comprimi' : 'Espandi'}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-cyan-400" />
        ) : (
          <ChevronRight className={`h-4 w-4 ${colors.text.tertiary}`} />
        )}
      </button>
    ) : null;

    return (
      <div key={task.id}>
        {/* Task Card */}
        <div>
          <TaskCard
            task={task}
            onClick={() => onTaskClick && onTaskClick(task)}
            onTimerStart={onTimerStart}
            showProject={showProject}
            expandButton={expandButton}
            hasSubtasks={hasSubtasks}
          />
        </div>

        {/* Subtasks - Inline/Compatto */}
        {isExpanded && hasSubtasks && (
          <div className="mt-1 space-y-1 pl-2">
            {subtasks.map((subtask) => renderTaskWithSubtasks(subtask, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (rootTasks.length === 0) {
    return <p className={`py-4 text-center text-sm ${colors.text.tertiary}`}>Nessun task</p>;
  }

  return (
    <div className={showGrid ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
      {rootTasks.map((task) => renderTaskWithSubtasks(task))}
    </div>
  );
};

export default TaskTreeList;
