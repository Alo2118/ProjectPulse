import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const TaskCalendar = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const getTasksForDate = (date) => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      return isSameDay(new Date(task.deadline), date);
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="card-lg">
      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-cyan-400" />
          <h3 className="card-header">Calendario Scadenze</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="rounded-lg p-2 transition-colors hover:bg-slate-700"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="h-5 w-5 text-slate-400 hover:text-cyan-400" />
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg px-3 py-1 text-sm font-medium text-cyan-300 transition-colors hover:border hover:border-cyan-500/30 hover:bg-cyan-500/10"
          >
            Oggi
          </button>
          <button
            onClick={nextMonth}
            className="rounded-lg p-2 transition-colors hover:bg-slate-700"
            aria-label="Mese successivo"
          >
            <ChevronRight className="h-5 w-5 text-slate-400 hover:text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Month/Year */}
      <div className="mb-4 text-center">
        <h4 className="text-xl font-bold text-cyan-300">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h4>
      </div>

      {/* Week Days */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold text-slate-400 sm:text-sm"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const tasksOnDay = getTasksForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);

          return (
            <div
              key={index}
              onClick={() => onDateClick && tasksOnDay.length > 0 && onDateClick(day, tasksOnDay)}
              className={`min-h-[60px] cursor-pointer rounded-lg border p-1 transition-all sm:min-h-[80px] sm:p-2 ${!isCurrentMonth ? 'border-slate-700/30 bg-slate-800/20 text-slate-500' : 'border-slate-700/50 bg-slate-800/40'} ${isDayToday ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500' : ''} ${tasksOnDay.length > 0 ? 'hover:border-cyan-500/50 hover:shadow-md hover:shadow-cyan-500/10' : 'hover:bg-slate-800/50'}`}
            >
              {/* Day Number */}
              <div
                className={`mb-1 text-xs font-medium sm:text-sm ${isDayToday ? 'font-bold text-cyan-300' : 'text-slate-200'}`}
              >
                {format(day, 'd')}
              </div>

              {/* Tasks Indicators */}
              {tasksOnDay.length > 0 && (
                <div className="space-y-1">
                  {tasksOnDay.slice(0, 2).map((task, i) => {
                    const statusColors = {
                      todo: 'bg-slate-600 text-slate-200',
                      in_progress: 'bg-blue-600 text-blue-100',
                      blocked: 'bg-red-600 text-red-100',
                      waiting_clarification: 'bg-amber-600 text-amber-100',
                      completed: 'bg-green-600 text-green-100',
                    };

                    return (
                      <div
                        key={i}
                        className={`truncate rounded border-2 border-transparent px-1 py-0.5 text-xs text-white ${statusColors[task.status] || 'bg-slate-600'}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {tasksOnDay.length > 2 && (
                    <div className="text-center text-xs font-medium text-slate-400">
                      +{tasksOnDay.length - 2}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-3 border-t-2 border-cyan-500/20 pt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-slate-600"></div>
          <span className="text-slate-400">Da fare</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-600"></div>
          <span className="text-slate-400">In corso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-red-600"></div>
          <span className="text-slate-400">Bloccato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-600"></div>
          <span className="text-slate-400">In attesa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-600"></div>
          <span className="text-slate-400">Completato</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCalendar;
