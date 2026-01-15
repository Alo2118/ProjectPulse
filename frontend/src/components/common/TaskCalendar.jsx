import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
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
    return tasks.filter(task => {
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
    <div className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-800">
            Calendario Scadenze
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            Oggi
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Mese successivo"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Month/Year */}
      <div className="text-center mb-4">
        <h4 className="text-xl font-bold text-slate-800">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h4>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-semibold text-slate-600 py-2">
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
              className={`
                min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border rounded-lg cursor-pointer transition-all
                ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'bg-white'}
                ${isDayToday ? 'ring-2 ring-primary-500 bg-primary-50' : ''}
                ${tasksOnDay.length > 0 ? 'hover:shadow-md hover:border-primary-300' : 'hover:bg-slate-50'}
              `}
            >
              {/* Day Number */}
              <div className={`text-xs sm:text-sm font-medium mb-1 ${isDayToday ? 'text-primary-600 font-bold' : ''}`}>
                {format(day, 'd')}
              </div>

              {/* Tasks Indicators */}
              {tasksOnDay.length > 0 && (
                <div className="space-y-1">
                  {tasksOnDay.slice(0, 2).map((task, i) => {
                    const statusColors = {
                      todo: 'bg-slate-500',
                      in_progress: 'bg-primary-500',
                      blocked: 'bg-danger-500',
                      waiting_clarification: 'bg-warning-500',
                      completed: 'bg-success-500'
                    };

                    return (
                      <div
                        key={i}
                        className={`text-xs px-1 py-0.5 rounded text-white truncate ${statusColors[task.status] || 'bg-slate-400'}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {tasksOnDay.length > 2 && (
                    <div className="text-xs text-slate-500 text-center font-medium">
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
      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-500"></div>
          <span className="text-slate-600">Da fare</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-500"></div>
          <span className="text-slate-600">In corso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-danger-500"></div>
          <span className="text-slate-600">Bloccato</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning-500"></div>
          <span className="text-slate-600">In attesa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success-500"></div>
          <span className="text-slate-600">Completato</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCalendar;
