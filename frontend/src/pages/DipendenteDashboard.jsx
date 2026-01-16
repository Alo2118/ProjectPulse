import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Plus, FileText, AlertTriangle, Calendar, LayoutGrid, LayoutList, PieChart, ClipboardList, Zap, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tasksApi, projectsApi } from '../services/api';
import Timer from '../components/Timer';
import TaskCard from '../components/TaskCard';
import TaskTreeList from '../components/TaskTreeList';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import DailyReportModal from '../components/DailyReportModal';
import { Button, StatCard, StatCardGrid, GamingKPICard, GamingKPIGrid, GamingLayout, GamingHeader, GamingCard } from '../components/ui';
import KanbanBoard from '../components/common/KanbanBoard';
import TaskCalendar from '../components/common/TaskCalendar';
import { formatTime, groupTasksByStatus, getOverdueTasks, getApproachingTasks } from '../utils/helpers';

// Lazy load charts to reduce initial bundle size
const TaskDistributionChart = lazy(() => import('../components/charts/TaskDistributionChart'));
const ProgressChart = lazy(() => import('../components/charts/ProgressChart'));

export default function DipendenteDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar, stats

  useEffect(() => {
    loadData();
    
    // Refresh when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.getAll({ assigned_to: user.id }),
        projectsApi.getAll()
      ]);
      const tasksData = tasksRes.data.data || tasksRes.data;
      setTasks(tasksData);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await tasksApi.update(taskId, updates);
      await loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Enrich tasks with parent title and subtask flag
  const tasksWithRelations = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const map = new Map(tasks.map(t => [t.id, t]));
    return tasks.map(t => ({
      ...t,
      is_subtask: !!t.parent_task_id,
      parent_title: t.parent_task_id ? map.get(t.parent_task_id)?.title : undefined
    }));
  }, [tasks]);

  // Memoize grouped tasks to avoid recalculation on every render
  const groupedTasks = useMemo(() => groupTasksByStatus(tasksWithRelations), [tasksWithRelations]);

  // Memoize stats calculation
  const stats = useMemo(() => ({
    total: tasks.length,
    in_progress: groupedTasks.in_progress.length,
    blocked: groupedTasks.blocked.length,
    waiting: groupedTasks.waiting_clarification.length,
    completed: groupedTasks.completed.length,
    totalTime: tasks.reduce((sum, t) => sum + (t.time_spent || 0), 0)
  }), [tasks, groupedTasks]);

  // Memoize weekly stats calculation
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const thisWeekCompleted = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= oneWeekAgo;
    });

    const thisWeekTime = thisWeekCompleted.reduce((sum, t) => sum + (t.time_spent || 0), 0);
    const avgTimePerTask = thisWeekCompleted.length > 0
      ? thisWeekTime / thisWeekCompleted.length / 3600
      : 0;

    return {
      completed: thisWeekCompleted.length,
      totalTime: thisWeekTime,
      avgTimePerTask
    };
  }, [tasks]);

  // Memoize progress data for chart - last 7 days
  const progressData = useMemo(() => {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
      const completed = tasks.filter(t => {
        if (!t.completed_at) return false;
        const completedDate = new Date(t.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;

      const total = tasks.filter(t => {
        const createdDate = new Date(t.created_at);
        return createdDate <= date;
      }).length;

      last7Days.push({ date: dateStr, completed, total });
    }

    return last7Days;
  }, [tasks]);

  // Memoize alerts calculation using utility functions
  const { overdueTasks, dueSoonTasks } = useMemo(() => ({
    overdueTasks: getOverdueTasks(tasks),
    dueSoonTasks: getApproachingTasks(tasks, 3)
  }), [tasks]);

  const viewModes = [
    { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { id: 'list', label: 'Lista', icon: LayoutList },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'stats', label: 'Statistiche', icon: PieChart }
  ];

  return (
    <GamingLayout>
      <GamingHeader
        title="Le mie Attività"
        subtitle="Gestisci i tuoi task e monitora i tuoi progressi"
        icon={Zap}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowReportModal(true)} className="bg-white border-2 border-slate-300 hover:border-blue-400 text-slate-700 shadow-sm hover:shadow-md transition-all font-bold">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Report</span>
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transition-all font-bold">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuovo Task</span>
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <GamingKPIGrid columns={4}>
        <GamingKPICard title="Totali" value={stats.total} icon={ClipboardList} gradient="from-purple-600 to-pink-700" shadowColor="purple" />
        <GamingKPICard title="In Corso" value={stats.in_progress} icon={Zap} gradient="from-blue-600 to-cyan-700" shadowColor="blue" />
        <GamingKPICard title="Completati" value={stats.completed} icon={CheckCircle2} gradient="from-emerald-600 to-green-700" shadowColor="emerald" />
        <GamingKPICard title="Tempo" value={formatTime(stats.totalTime)} icon={Clock} gradient="from-orange-600 to-red-700" shadowColor="orange" />
      </GamingKPIGrid>

        {/* Layout a due colonne */}
        <div className="grid lg:grid-cols-12 gap-4 mb-4">
          {/* Colonna principale - 8 colonne */}
          <div className="lg:col-span-8 space-y-4">
            {/* Weekly Stats */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-md hover:shadow-xl transition-all">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Questa Settimana</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-200 shadow-sm">
                  <div className="text-2xl font-bold text-emerald-700">{weeklyStats.completed}</div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">Completati</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200 shadow-sm">
                  <div className="text-2xl font-bold text-cyan-700">{formatTime(weeklyStats.totalTime)}</div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">Tempo</div>
                </div>
                <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 shadow-sm">
                  <div className="text-2xl font-bold text-purple-700">{weeklyStats.avgTimePerTask.toFixed(1)}h</div>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">Media/Task</div>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-2 shadow-md">
              <div className="flex gap-2 flex-wrap">
                {viewModes.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setViewMode(mode.id)}
                      className={viewMode === mode.id 
                        ? 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-bold transition-all shadow-xl hover:shadow-2xl' 
                        : 'flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all font-semibold'}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar destra - 4 colonne */}
          <div className="lg:col-span-4 space-y-4">
            {/* Timer */}
            <Timer onTimerChange={loadData} />

            {/* Alerts Compatti */}
            {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
              <div className="space-y-2">
                {overdueTasks.length > 0 && (
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 shadow-md hover:shadow-xl transition-all p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-red-100 text-red-700 text-sm">🚨</div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          {overdueTasks.length} attività in ritardo
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                        </h4>
                        <div className="mt-1 text-xs text-red-700 space-y-1">
                          {overdueTasks.slice(0, 2).map(task => (
                            <div key={task.id} className="flex items-center gap-1">
                              <span className="text-red-400">•</span>
                              <button
                                onClick={() => setSelectedTask(task)}
                                className="hover:underline text-left truncate"
                              >
                                {task.title}
                              </button>
                            </div>
                          ))}
                          {overdueTasks.length > 2 && (
                            <p className="text-xs text-red-600 italic">
                              ... e altre {overdueTasks.length - 2}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {dueSoonTasks.length > 0 && (
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 shadow-md hover:shadow-xl transition-all p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700 text-sm">⏰</div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                          {dueSoonTasks.length} in scadenza (3 giorni)
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                        </h4>
                        <div className="mt-1 text-xs text-amber-700 space-y-1">
                          {dueSoonTasks.slice(0, 2).map(task => {
                            const deadline = new Date(task.deadline);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            deadline.setHours(0, 0, 0, 0);
                            const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                            return (
                              <div key={task.id} className="flex items-center gap-1">
                                <span className="text-amber-400">•</span>
                                <button
                                  onClick={() => setSelectedTask(task)}
                                  className="hover:underline text-left truncate flex-1"
                                >
                                  {task.title}
                                </button>
                                <span className="text-[11px] whitespace-nowrap text-amber-600">
                                  ({diffDays === 0 ? 'oggi' : `${diffDays}g`})
                                </span>
                              </div>
                            );
                          })}
                          {dueSoonTasks.length > 2 && (
                            <p className="text-xs text-amber-600 italic">
                              ... e altre {dueSoonTasks.length - 2}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="animate-pulse bg-white rounded-lg p-8 border border-slate-200">
              <div className="h-64 bg-slate-200 rounded"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div className="animate-fade-in">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  Vista Kanban ({tasks.length} task)
                </h3>
                <KanbanBoard
                  tasks={tasksWithRelations}
                  onTaskClick={setSelectedTask}
                  onTaskUpdate={handleTaskUpdate}
                />
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-4 animate-fade-in">
                {/* In Progress */}
                {groupedTasks.in_progress.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🚀</span>
                      <h3 className="text-base font-bold text-slate-900">
                        In Corso
                      </h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-blue-300">
                        {groupedTasks.in_progress.length}
                      </span>
                    </div>
                    <TaskTreeList
                      tasks={groupedTasks.in_progress}
                      allTasks={tasksWithRelations}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showGrid={true}
                    />
                  </section>
                )}

                {/* Blocked */}
                {groupedTasks.blocked.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🚫</span>
                      <h3 className="text-base font-bold text-slate-900">
                        Bloccati
                      </h3>
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-red-300">
                        {groupedTasks.blocked.length}
                      </span>
                    </div>
                    <TaskTreeList
                      tasks={groupedTasks.blocked}
                      allTasks={tasksWithRelations}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showGrid={true}
                    />
                  </section>
                )}

                {/* Waiting Clarification */}
                {groupedTasks.waiting_clarification.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">❓</span>
                      <h3 className="text-base font-bold text-slate-900">
                        In Attesa
                      </h3>
                      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-orange-300">
                        {groupedTasks.waiting_clarification.length}
                      </span>
                    </div>
                    <TaskTreeList
                      tasks={groupedTasks.waiting_clarification}
                      allTasks={tasksWithRelations}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showGrid={true}
                    />
                  </section>
                )}

                {/* Todo */}
                {groupedTasks.todo.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">📋</span>
                      <h3 className="text-base font-bold text-slate-900">
                        Da Fare
                      </h3>
                      <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-slate-300">
                        {groupedTasks.todo.length}
                      </span>
                    </div>
                    <TaskTreeList
                      tasks={groupedTasks.todo}
                      allTasks={tasksWithRelations}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showGrid={true}
                    />
                  </section>
                )}

                {/* Completed */}
                {groupedTasks.completed.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">✅</span>
                      <h3 className="text-base font-bold text-slate-900">
                        Completati
                      </h3>
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full border-2 border-green-300">
                        {groupedTasks.completed.length}
                      </span>
                    </div>
                    <TaskTreeList
                      tasks={groupedTasks.completed.slice(0, 6)}
                      allTasks={tasksWithRelations}
                      onTaskClick={(task) => setSelectedTask(task)}
                      onTimerStart={loadData}
                      showGrid={true}
                    />
                    {groupedTasks.completed.length > 6 && (
                      <div className="text-center mt-3">
                        <p className="text-sm text-slate-500">
                          Mostrati 6 di {groupedTasks.completed.length} task completati
                        </p>
                      </div>
                    )}
                  </section>
                )}

                {tasks.length === 0 && (
                  <div className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Nessuna attività presente
                      </h3>
                      <p className="text-slate-500 mb-4 text-sm">
                        Inizia creando la tua prima attività
                      </p>
                      <Button onClick={() => setShowCreateModal(true)} className="hover-scale">
                        Crea la prima attività
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <div className="animate-fade-in">
                <TaskCalendar
                  tasks={tasks}
                  onDateClick={(date, tasksOnDate) => {
                    if (tasksOnDate.length === 1) {
                      setSelectedTask(tasksOnDate[0]);
                    }
                  }}
                />
              </div>
            )}

            {/* Stats View */}
            {viewMode === 'stats' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <TaskDistributionChart tasks={tasks} />
                  </Suspense>
                  <Suspense fallback={<div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md h-[400px] flex items-center justify-center text-slate-500">Caricamento grafico...</div>}>
                    <ProgressChart progressData={progressData} title="Il mio Progresso (Ultimi 7 Giorni)" />
                  </Suspense>
                </div>

                {/* Projects Breakdown */}
                <GamingCard>
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Task per Progetto
                  </h3>
                  <div className="space-y-4">
                    {projects.map(project => {
                      const projectTasks = tasks.filter(t => t.project_id === project.id);
                      const completedTasks = projectTasks.filter(t => t.status === 'completed');
                      const completionRate = projectTasks.length > 0
                        ? (completedTasks.length / projectTasks.length) * 100
                        : 0;

                      if (projectTasks.length === 0) return null;

                      return (
                        <div key={project.id} className="border-b-2 border-slate-200 pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-900">{project.name}</h4>
                            <span className="text-sm font-semibold text-slate-600">
                              {completedTasks.length}/{projectTasks.length} completati
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 border-2 border-slate-300">
                            <div
                              className="bg-gradient-to-r from-emerald-600 to-green-600 h-2 rounded-full transition-all"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>{completionRate.toFixed(0)}% completato</span>
                            <span>
                              {formatTime(projectTasks.reduce((sum, t) => sum + (t.time_spent || 0), 0))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GamingCard>
              </div>
            )}
          </>
        )}

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadData}
        />
      )}

      {showCreateModal && (
        <CreateTaskModal
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onCreate={loadData}
        />
      )}

      {showReportModal && (
        <DailyReportModal
          onClose={() => setShowReportModal(false)}
        />
      )}
    </GamingLayout>
  );
}
