import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { tasksApi } from '../services/api';
import TaskModal from '../components/TaskModal';
import { GamingLayout, GamingHeader, GamingCard, GamingLoader, Button } from '../components/ui';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await tasksApi.getAll();
      // Handle paginated response and filter only tasks with deadlines
      const tasksData = response.data.data || response.data;
      setTasks(tasksData.filter(t => t.deadline));
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert to Monday = 0
  };

  const getTasksForDate = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.deadline === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const isPast = (day) => {
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    dateToCheck.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return dateToCheck < todayDate;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const calendarDays = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (loading) {
    return <GamingLoader message="Caricamento calendario..." />;
  }

  return (
    <GamingLayout>
      <GamingHeader
        title="Calendario"
        subtitle="Scadenze e milestone"
        icon={CalendarIcon}
      />

      {/* Month navigation */}
      <GamingCard>
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={previousMonth}
            className="bg-slate-800 hover:bg-slate-700 text-white p-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-xl font-bold text-white capitalize">
            {monthName}
          </h3>
          <Button
            onClick={nextMonth}
            className="bg-slate-800 hover:bg-slate-700 text-white p-2"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="text-center font-semibold text-sm text-cyan-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayTasks = getTasksForDate(day);

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-2 transition-all hover:shadow-lg hover:shadow-cyan-500/20 ${
                  isToday(day)
                    ? 'bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-cyan-500 border-2'
                    : isPast(day)
                    ? 'bg-slate-800/30 border-slate-700/30'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50'
                }`}
              >
                <div className="h-full flex flex-col">
                  <div className={`text-right text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-cyan-400' : isPast(day) ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                    {day}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full text-left text-xs px-2 py-1 rounded truncate transition-all ${
                          task.status === 'completed'
                            ? 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50'
                            : task.status === 'blocked'
                            ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
                            : task.priority === 'high'
                            ? 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/50'
                            : 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/50'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-center text-slate-400 font-medium">
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border-2 border-cyan-500 rounded"></div>
            <span className="text-slate-300">Oggi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-900/50 rounded"></div>
            <span className="text-slate-300">Alta priorità</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-900/50 rounded"></div>
            <span className="text-slate-300">Normale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-900/50 rounded"></div>
            <span className="text-slate-300">Bloccato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-900/50 rounded"></div>
            <span className="text-slate-300">Completato</span>
          </div>
        </div>

        {/* Task count */}
        <div className="mt-4 text-center text-sm text-slate-400">
          {tasks.length} attività con scadenza nel database
        </div>
      </GamingCard>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            loadTasks();
            setSelectedTask(null);
          }}
        />
      )}
    </GamingLayout>
  );
}
