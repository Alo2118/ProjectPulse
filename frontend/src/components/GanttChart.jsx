import { useMemo } from 'react';
import { Calendar, CheckCircle, Circle, AlertCircle, Zap } from 'lucide-react';

// Calculate Critical Path using CPM (Critical Path Method)
const calculateCriticalPath = (tasks) => {
  if (!tasks || tasks.length === 0) return new Set();

  // Build task map and dependency graph
  const taskMap = new Map();
  tasks.forEach(task => {
    taskMap.set(task.id, {
      ...task,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: 0,
      latestFinish: 0,
      slack: 0,
      duration: task.hours || 1 // Use estimated hours or default to 1 day
    });
  });

  // Forward pass - calculate earliest start/finish
  const visited = new Set();
  const calculateEarliest = (taskId) => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    // If task has dependency, calculate dependency first
    if (task.depends_on_task_id) {
      calculateEarliest(task.depends_on_task_id);
      const dependency = taskMap.get(task.depends_on_task_id);
      if (dependency) {
        task.earliestStart = dependency.earliestFinish;
      }
    }

    task.earliestFinish = task.earliestStart + task.duration;
  };

  // Calculate earliest times for all tasks
  tasks.forEach(task => calculateEarliest(task.id));

  // Find project duration (max earliest finish)
  const projectDuration = Math.max(...Array.from(taskMap.values()).map(t => t.earliestFinish));

  // Backward pass - calculate latest start/finish
  tasks.forEach(task => {
    const t = taskMap.get(task.id);
    // Tasks without successors have latest finish = project duration
    const hasSuccessors = tasks.some(other => other.depends_on_task_id === task.id);
    if (!hasSuccessors) {
      t.latestFinish = projectDuration;
    }
  });

  const visitedBackward = new Set();
  const calculateLatest = (taskId) => {
    if (visitedBackward.has(taskId)) return;
    visitedBackward.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    // Find all tasks that depend on this task
    const successors = tasks.filter(t => t.depends_on_task_id === taskId);

    if (successors.length > 0) {
      // Latest finish is the minimum latest start of all successors
      const minSuccessorStart = Math.min(...successors.map(s => {
        calculateLatest(s.id);
        return taskMap.get(s.id).latestStart;
      }));
      task.latestFinish = minSuccessorStart;
    }

    task.latestStart = task.latestFinish - task.duration;
    task.slack = task.latestStart - task.earliestStart;
  };

  // Calculate latest times for all tasks
  tasks.forEach(task => calculateLatest(task.id));

  // Critical path = tasks with zero slack
  const criticalTasks = new Set();
  taskMap.forEach((task, id) => {
    if (Math.abs(task.slack) < 0.01) { // Float comparison tolerance
      criticalTasks.add(id);
    }
  });

  return criticalTasks;
};

export default function GanttChart({ milestones, tasks, onMilestoneClick, onTaskClick }) {
  const chartData = useMemo(() => {
    // Find date range
    const allDates = [
      ...milestones.map(m => new Date(m.created_at)),
      ...milestones.map(m => m.due_date ? new Date(m.due_date) : null).filter(Boolean),
      ...tasks.map(t => t.start_date ? new Date(t.start_date) : new Date(t.created_at)),
      ...tasks.map(t => t.deadline ? new Date(t.deadline) : null).filter(Boolean)
    ];

    if (allDates.length === 0) {
      const today = new Date();
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
        totalDays: 90,
        milestones: [],
        tasks: []
      };
    }

    const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 14);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Process milestones
    const processedMilestones = milestones.map(milestone => {
      const start = new Date(milestone.created_at);
      const end = milestone.due_date ? new Date(milestone.due_date) : new Date();

      const startOffset = Math.floor((start - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

      return {
        ...milestone,
        startOffset: (startOffset / totalDays) * 100,
        width: (duration / totalDays) * 100,
        start,
        end
      };
    });

    // Calculate critical path
    const criticalTaskIds = calculateCriticalPath(tasks);

    // Process tasks
    const processedTasks = tasks.map(task => {
      // Use start_date if available, otherwise fall back to created_at
      const start = task.start_date ? new Date(task.start_date) : new Date(task.created_at);
      const end = task.deadline ? new Date(task.deadline) : task.completed_at ? new Date(task.completed_at) : new Date();

      const startOffset = Math.floor((start - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

      return {
        ...task,
        startOffset: (startOffset / totalDays) * 100,
        width: (duration / totalDays) * 100,
        start,
        end,
        progress: task.progress_percentage || 0,
        hours: task.estimated_hours || 0,
        isCritical: criticalTaskIds.has(task.id)
      };
    });

    return {
      startDate,
      endDate,
      totalDays,
      milestones: processedMilestones,
      tasks: processedTasks,
      criticalCount: criticalTaskIds.size
    };
  }, [milestones, tasks]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'blocked':
        return 'bg-red-500';
      case 'waiting_clarification':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getMilestoneColor = (milestone) => {
    if (milestone.status === 'completed') return 'bg-green-600';
    if (milestone.status === 'cancelled') return 'bg-gray-400';

    const now = new Date();
    const dueDate = milestone.due_date ? new Date(milestone.due_date) : null;
    if (dueDate && dueDate < now) return 'bg-red-600';

    return 'bg-primary-600';
  };

  // Generate month headers
  const generateMonthHeaders = () => {
    const headers = [];
    const current = new Date(chartData.startDate);
    const end = new Date(chartData.endDate);

    while (current <= end) {
      const monthStart = new Date(current);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const displayEnd = monthEnd > end ? end : monthEnd;

      const startOffset = Math.floor((monthStart - chartData.startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((displayEnd - monthStart) / (1000 * 60 * 60 * 24)) + 1;

      headers.push({
        label: monthStart.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
        startOffset: (startOffset / chartData.totalDays) * 100,
        width: (duration / chartData.totalDays) * 100
      });

      current.setMonth(current.getMonth() + 1);
    }

    return headers;
  };

  const monthHeaders = generateMonthHeaders();

  // Mark today
  const todayOffset = ((new Date() - chartData.startDate) / (1000 * 60 * 60 * 24) / chartData.totalDays) * 100;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-md hover:shadow-xl transition-all p-6 overflow-auto">
      {/* Critical Path Info */}
      {chartData.criticalCount > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Zap className="w-5 h-5 text-orange-600 fill-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-orange-900 text-sm">
              Percorso Critico Identificato
            </div>
            <div className="text-xs text-orange-700 font-medium mt-1">
              {chartData.criticalCount} {chartData.criticalCount === 1 ? 'task è' : 'task sono'} sul percorso critico.
              Qualsiasi ritardo in {chartData.criticalCount === 1 ? 'questo task' : 'questi task'} impatterà la data di consegna del progetto.
            </div>
          </div>
        </div>
      )}

      {/* Timeline Header */}
      <div className="mb-6 relative" style={{ minWidth: '800px' }}>
        <div className="flex border-b-2 border-slate-300">
          {monthHeaders.map((month, i) => (
            <div
              key={i}
              className="text-center font-bold text-sm text-slate-900 py-2 border-r-2 border-slate-200"
              style={{
                marginLeft: `${month.startOffset}%`,
                width: `${month.width}%`
              }}
            >
              {month.label}
            </div>
          ))}
        </div>

        {/* Today marker */}
        {todayOffset >= 0 && todayOffset <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${todayOffset}%` }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-600 font-semibold whitespace-nowrap">
              Oggi
            </div>
          </div>
        )}
      </div>

      {/* Gantt Content */}
      <div className="space-y-2" style={{ minWidth: '800px' }}>
        {/* Milestones */}
        {chartData.milestones.map(milestone => (
          <div key={`milestone-${milestone.id}`} className="mb-6">
            {/* Milestone bar */}
            <div className="flex items-center mb-2">
              <div className="w-48 pr-4 flex-shrink-0">
                <button
                  onClick={() => onMilestoneClick?.(milestone)}
                  className="text-left hover:text-blue-600 transition-colors"
                >
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    {milestone.name}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {milestone.start.toLocaleDateString('it-IT')} - {milestone.end.toLocaleDateString('it-IT')}
                  </div>
                </button>
              </div>
              <div className="flex-1 relative h-8">
                <div
                  className={`absolute ${getMilestoneColor(milestone)} rounded-lg h-full shadow-md hover:shadow-lg transition-shadow cursor-pointer group`}
                  style={{
                    left: `${milestone.startOffset}%`,
                    width: `${milestone.width}%`
                  }}
                  onClick={() => onMilestoneClick?.(milestone)}
                >
                  <div className="px-2 py-1 text-white text-xs font-medium truncate">
                    {milestone.task_count || 0} attività
                  </div>
                  {milestone.status === 'completed' && (
                    <CheckCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Tasks for this milestone */}
            {chartData.tasks
              .filter(task => task.milestone_id === milestone.id)
              .map(task => (
                <div key={`task-${task.id}`} className="flex items-center ml-8 mb-1">
                  <div className="w-40 pr-4 flex-shrink-0">
                    <button
                      onClick={() => onTaskClick?.(task)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="text-xs font-semibold truncate flex items-center gap-1">
                        {task.isCritical && <Zap className="w-3 h-3 text-orange-600 fill-orange-600" />}
                        {task.title}
                      </div>
                      {task.hours > 0 && (
                        <div className="text-xs text-slate-600 font-medium">{task.hours}h</div>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute ${getStatusColor(task.status)} rounded h-full shadow hover:shadow-md transition-shadow cursor-pointer ${task.isCritical ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                      style={{
                        left: `${task.startOffset}%`,
                        width: `${task.width}%`
                      }}
                      onClick={() => onTaskClick?.(task)}
                      title={task.isCritical ? '⚡ Task sul percorso critico - qualsiasi ritardo impatta la consegna del progetto' : ''}
                    >
                      {/* Progress bar background */}
                      {task.progress > 0 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white bg-opacity-30 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      )}
                      <div className="relative px-2 py-1 text-white text-xs truncate flex items-center justify-between">
                        <span>{task.assigned_to_name || 'Non assegnato'}</span>
                        {task.progress > 0 && <span className="font-semibold">{task.progress}%</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}

        {/* Tasks without milestone */}
        {chartData.tasks.filter(task => !task.milestone_id).length > 0 && (
          <div className="mt-6 pt-6 border-t-2 border-slate-200">
            <div className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Circle className="w-4 h-4" />
              Attività senza Milestone
            </div>
            {chartData.tasks
              .filter(task => !task.milestone_id)
              .map(task => (
                <div key={`task-${task.id}`} className="flex items-center mb-2">
                  <div className="w-48 pr-4 flex-shrink-0">
                    <button
                      onClick={() => onTaskClick?.(task)}
                      className="text-left hover:text-blue-600 transition-colors"
                    >
                      <div className="text-xs font-semibold truncate flex items-center gap-1">
                        {task.isCritical && <Zap className="w-3 h-3 text-orange-600 fill-orange-600" />}
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        {task.project_name || 'Nessun progetto'}
                        {task.hours > 0 && ` • ${task.hours}h`}
                      </div>
                    </button>
                  </div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute ${getStatusColor(task.status)} rounded h-full shadow hover:shadow-md transition-shadow cursor-pointer ${task.isCritical ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
                      style={{
                        left: `${task.startOffset}%`,
                        width: `${task.width}%`
                      }}
                      onClick={() => onTaskClick?.(task)}
                      title={task.isCritical ? '⚡ Task sul percorso critico - qualsiasi ritardo impatta la consegna del progetto' : ''}
                    >
                      {/* Progress bar background */}
                      {task.progress > 0 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-white bg-opacity-30 rounded-l"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      )}
                      <div className="relative px-2 py-1 text-white text-xs truncate flex items-center justify-between">
                        <span>{task.assigned_to_name || 'Non assegnato'}</span>
                        {task.progress > 0 && <span className="font-semibold">{task.progress}%</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {chartData.milestones.length === 0 && chartData.tasks.length === 0 && (
          <div className="text-center py-12 text-slate-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p className="font-semibold">Nessuna milestone o attività da visualizzare</p>
            <p className="text-sm mt-2">Crea milestone e attività con date per vederle nel Gantt</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t-2 border-slate-200">
        <div className="flex flex-wrap gap-4 text-xs font-semibold mb-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Da fare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>In corso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>In attesa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Bloccato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Completato</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <div className="w-4 h-4 bg-blue-500 rounded ring-2 ring-orange-600"></div>
          <Zap className="w-3 h-3 text-orange-600 fill-orange-600" />
          <span className="font-bold text-orange-800">Percorso Critico</span>
          <span className="text-slate-600">- Task che impattano direttamente la data di consegna</span>
        </div>
      </div>
    </div>
  );
}
