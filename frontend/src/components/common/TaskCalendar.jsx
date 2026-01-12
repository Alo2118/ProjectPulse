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
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Calendario Scadenze
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Oggi
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Month/Year */}
      <div className="text-center mb-4">
        <h4 className="text-xl font-bold text-gray-800">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h4>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
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
                min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all
                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                ${isDayToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                ${tasksOnDay.length > 0 ? 'hover:shadow-md hover:border-blue-300' : 'hover:bg-gray-50'}
              `}
            >
              {/* Day Number */}
              <div className={`text-sm font-medium mb-1 ${isDayToday ? 'text-blue-600 font-bold' : ''}`}>
                {format(day, 'd')}
              </div>

              {/* Tasks Indicators */}
              {tasksOnDay.length > 0 && (
                <div className="space-y-1">
                  {tasksOnDay.slice(0, 2).map((task, i) => {
                    const statusColors = {
                      todo: 'bg-gray-400',
                      in_progress: 'bg-blue-500',
                      blocked: 'bg-red-500',
                      waiting_clarification: 'bg-yellow-500',
                      completed: 'bg-green-500'
                    };

                    return (
                      <div
                        key={i}
                        className={`text-xs px-1 py-0.5 rounded text-white truncate ${statusColors[task.status] || 'bg-gray-400'}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    );
                  })}
                  {tasksOnDay.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{tasksOnDay.length - 2} altri
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400"></div>
          <span>Da fare</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span>In corso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>Bloccato</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span>In attesa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>Completato</span>
        </div>
      </div>
    </div>
  );
};

export default TaskCalendar;
