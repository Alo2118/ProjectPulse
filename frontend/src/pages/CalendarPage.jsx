import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { tasksApi } from '../services/api';
import Navbar from '../components/Navbar';
import TaskModal from '../components/TaskModal';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-7 h-7 text-primary-600" />
                Calendario Scadenze
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Pianificazione attività R&D per milestone e progetti
              </p>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl shadow-md p-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 capitalize">
              {monthName}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-4 animate-pulse">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-4 animate-slide-up">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-3 mb-4">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-gray-700 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayTasks = getTasksForDate(day);
                const hasOverdue = dayTasks.some(t => t.status !== 'completed' && isPast(day));
                const hasUrgent = dayTasks.some(t => t.priority === 'high' && t.status !== 'completed');

                return (
                  <div
                    key={day}
                    className={`aspect-square border rounded-lg p-1.5 transition-all hover:shadow-md ${
                      isToday(day)
                        ? 'bg-primary-50 border-primary-500 border-2'
                        : isPast(day)
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    <div className="h-full flex flex-col">
                      <div className={`text-right text-sm font-medium mb-1 ${
                        isToday(day) ? 'text-primary-700' : isPast(day) ? 'text-gray-400' : 'text-gray-700'
                      }`}>
                        {day}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-0.5">
                        {dayTasks.slice(0, 3).map(task => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate transition-colors ${
                              task.status === 'completed'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : task.status === 'blocked'
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : task.priority === 'high'
                                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </button>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-center text-gray-500 font-medium">
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
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary-50 border-2 border-primary-500 rounded"></div>
                <span>Oggi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 rounded"></div>
                <span>Alta priorità</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded"></div>
                <span>Normale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 rounded"></div>
                <span>Bloccato</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded"></div>
                <span>Completato</span>
              </div>
            </div>
          </div>
        )}

        {/* Task count */}
        {!loading && (
          <div className="mt-4 text-center text-sm text-gray-600">
            {tasks.length} attività con scadenza nel database
          </div>
        )}
      </div>

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
    </div>
  );
}
