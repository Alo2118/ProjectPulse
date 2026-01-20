import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import theme, { cn } from '../styles/theme';
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
      setTasks(tasksData.filter((t) => t.deadline));
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
    return tasks.filter((task) => task.deadline === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
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
      <GamingHeader title="Calendario" subtitle="Scadenze e milestone" icon={CalendarIcon} />

      {/* Month navigation */}
      <GamingCard>
        <div className="mb-6 flex items-center justify-between">
          <Button onClick={previousMonth} className="btn-primary">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="card-header capitalize">{monthName}</h3>
          <Button onClick={nextMonth} className="btn-primary">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="mb-4 grid grid-cols-7 gap-2">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
            <div key={day} className={cn('py-2 text-center text-sm font-semibold', theme.text.accent)}>
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
                className={cn(
                  'aspect-square rounded-lg border p-2 transition-all',
                  isToday(day)
                    ? 'border-2 border-cyan-500 bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                    : isPast(day)
                      ? cn(theme.border, theme.bg.tertiary)
                      : cn('border-cyan-500/20', theme.bg.secondary, 'hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20')
                )}
              >
                <div className="flex h-full flex-col">
                  <div
                    className={cn(
                      'mb-1 text-right text-sm font-medium',
                      isToday(day)
                        ? theme.text.accent
                        : isPast(day)
                          ? theme.text.tertiary
                          : theme.text.primary
                    )}
                  >
                    {day}
                  </div>

                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          'w-full truncate rounded border-2 border-transparent px-2 py-1 text-left text-xs transition-all',
                          task.status === 'completed'
                            ? 'bg-green-500/20 text-green-300 hover:border-green-500/50 hover:bg-green-500/30'
                            : task.status === 'blocked'
                              ? 'bg-red-500/20 text-red-300 hover:border-red-500/50 hover:bg-red-500/30'
                              : task.priority === 'high'
                                ? 'bg-orange-500/20 text-orange-300 hover:border-orange-500/50 hover:bg-orange-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-500/30'
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className={cn('text-center text-xs font-medium', theme.text.tertiary)}>
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
        <div className={cn('mt-6 flex flex-wrap gap-6 border-t pt-6 text-xs', theme.border)}>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border-2 border-cyan-500 bg-gradient-to-br from-cyan-900/50 to-blue-900/50"></div>
            <span className={theme.text.secondary}>Oggi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-900/50"></div>
            <span className={theme.text.secondary}>Alta priorità</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-cyan-900/50"></div>
            <span className={theme.text.secondary}>Normale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-900/50"></div>
            <span className={theme.text.secondary}>Bloccato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-emerald-900/50"></div>
            <span className={theme.text.secondary}>Completato</span>
          </div>
        </div>

        {/* Task count */}
        <div className={cn('mt-4 text-center text-sm', theme.text.tertiary)}>
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
