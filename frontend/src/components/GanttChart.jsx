import { useMemo } from 'react';
import { Calendar, CheckCircle, Circle, AlertCircle } from 'lucide-react';

export default function GanttChart({ milestones, tasks, onMilestoneClick, onTaskClick }) {
  const chartData = useMemo(() => {
    // Find date range
    const allDates = [
      ...milestones.map(m => new Date(m.created_at)),
      ...milestones.map(m => m.due_date ? new Date(m.due_date) : null).filter(Boolean),
      ...tasks.map(t => new Date(t.created_at)),
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

    // Process tasks
    const processedTasks = tasks.map(task => {
      const start = new Date(task.created_at);
      const end = task.deadline ? new Date(task.deadline) : task.completed_at ? new Date(task.completed_at) : new Date();

      const startOffset = Math.floor((start - startDate) / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

      return {
        ...task,
        startOffset: (startOffset / totalDays) * 100,
        width: (duration / totalDays) * 100,
        start,
        end
      };
    });

    return {
      startDate,
      endDate,
      totalDays,
      milestones: processedMilestones,
      tasks: processedTasks
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
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-auto">
      {/* Timeline Header */}
      <div className="mb-6 relative" style={{ minWidth: '800px' }}>
        <div className="flex border-b border-gray-300">
          {monthHeaders.map((month, i) => (
            <div
              key={i}
              className="text-center font-semibold text-sm text-gray-700 py-2 border-r border-gray-200"
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
                  className="text-left hover:text-primary-600 transition-colors"
                >
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    {milestone.name}
                  </div>
                  <div className="text-xs text-gray-500">
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
                      className="text-left hover:text-primary-600 transition-colors"
                    >
                      <div className="text-xs font-medium truncate">{task.title}</div>
                    </button>
                  </div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute ${getStatusColor(task.status)} rounded h-full shadow hover:shadow-md transition-shadow cursor-pointer opacity-80`}
                      style={{
                        left: `${task.startOffset}%`,
                        width: `${task.width}%`
                      }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="px-2 py-1 text-white text-xs truncate">
                        {task.assigned_to_name || 'Non assegnato'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}

        {/* Tasks without milestone */}
        {chartData.tasks.filter(task => !task.milestone_id).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
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
                      className="text-left hover:text-primary-600 transition-colors"
                    >
                      <div className="text-xs font-medium truncate">{task.title}</div>
                      <div className="text-xs text-gray-500">
                        {task.project_name || 'Nessun progetto'}
                      </div>
                    </button>
                  </div>
                  <div className="flex-1 relative h-6">
                    <div
                      className={`absolute ${getStatusColor(task.status)} rounded h-full shadow hover:shadow-md transition-shadow cursor-pointer opacity-80`}
                      style={{
                        left: `${task.startOffset}%`,
                        width: `${task.width}%`
                      }}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="px-2 py-1 text-white text-xs truncate">
                        {task.assigned_to_name || 'Non assegnato'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {chartData.milestones.length === 0 && chartData.tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Nessuna milestone o attività da visualizzare</p>
            <p className="text-sm mt-2">Crea milestone e attività con date per vederle nel Gantt</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
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
    </div>
  );
}
