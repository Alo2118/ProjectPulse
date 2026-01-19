/**
 * DIPENDENTE DASHBOARD - Versione Refactored
 *
 * Differenze principali:
 * 1. ✅ Usa theme system invece di classi hardcoded
 * 2. ✅ API con caching automatico (useApiCache)
 * 3. ✅ Optimistic updates sui task
 * 4. ✅ Nessun reload completo su update (solo mutate)
 * 5. ✅ Prefetch progetti in background
 *
 * Performance improvements:
 * - Cache 5 minuti su tasks (stale-while-revalidate)
 * - Deduplication automatica richieste duplicate
 * - Update ottimistici (UI istantanea)
 * - Prefetch progetti quando user torna al tab
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  LayoutGrid,
  LayoutList,
  Calendar as CalendarIcon,
  PieChart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import theme, { cn } from '../styles/theme';
import { useApiCache, useApiMutation, prefetchData, invalidateCache } from '../hooks/useApiCache';
import { tasksApi, projectsApi } from '../services/api';
import TaskCard from '../components/TaskCard.refactored';
import KanbanBoard from '../components/common/KanbanBoard';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';

export default function DipendenteDashboard() {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // kanban, list, calendar, stats

  // ==================== API CACHE ====================

  // Tasks con cache 5 minuti
  const {
    data: tasks = [],
    loading: tasksLoading,
    error: tasksError,
    mutate: mutateTasks,
    refetch: refetchTasks,
  } = useApiCache(
    `tasks-user-${user.id}`, // Cache key univoca
    () => tasksApi.getAll({ assigned_to: user.id }),
    {
      staleTime: 5 * 60 * 1000, // Cache 5 minuti
      retry: 2, // Riprova 2 volte in caso di errore
    }
  );

  // Progetti con cache 10 minuti
  const {
    data: projects = [],
    loading: projectsLoading,
  } = useApiCache('projects', () => projectsApi.getAll(), {
    staleTime: 10 * 60 * 1000, // Cache 10 minuti
  });

  // ==================== MUTATIONS ====================

  // Update task con optimistic update
  const { mutate: updateTask } = useApiMutation(
    ({ id, updates }) => tasksApi.update(id, updates),
    {
      onSuccess: () => {
        // Invalida cache per ricaricare
        invalidateCache(`tasks-user-${user.id}`);
      },
      onError: (error) => {
        console.error('Errore update task:', error);
        // TODO: Mostrare toast error
      },
    }
  );

  // Create task
  const { mutate: createTask, loading: creating } = useApiMutation(
    (data) => tasksApi.create(data),
    {
      invalidate: `tasks-user-${user.id}`, // Invalida cache tasks
      onSuccess: () => {
        setShowCreateModal(false);
        // TODO: Mostrare toast success
      },
    }
  );

  // ==================== HANDLERS ====================

  const handleTaskUpdate = async (taskId, updates) => {
    // Optimistic update: aggiorna UI immediatamente
    await mutateTasks(
      (currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      false // Non fare refetch subito
    );

    // Poi invia al server
    try {
      await updateTask({ id: taskId, updates });
    } catch (error) {
      // Rollback in caso di errore (fatto automaticamente)
      console.error('Update fallito:', error);
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleCreateTask = async (taskData) => {
    await createTask({
      ...taskData,
      assigned_to: user.id,
    });
  };

  // ==================== PREFETCH ====================

  // Prefetch quando tab diventa visibile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Prefetch projects in background
        prefetchData('projects', () => projectsApi.getAll());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ==================== COMPUTED DATA ====================

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const in_progress = tasks.filter((t) => t.status === 'in_progress').length;
    const blocked = tasks.filter((t) => t.status === 'blocked').length;

    return { total, completed, in_progress, blocked };
  }, [tasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date();
    return tasks.filter((task) => {
      if (!task.deadline || task.status === 'completed') return false;
      return new Date(task.deadline) < today;
    });
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === 'todo'),
      in_progress: tasks.filter((t) => t.status === 'in_progress'),
      blocked: tasks.filter((t) => t.status === 'blocked'),
      waiting_clarification: tasks.filter((t) => t.status === 'waiting_clarification'),
      completed: tasks.filter((t) => t.status === 'completed'),
    };
  }, [tasks]);

  // ==================== LOADING STATE ====================

  if (tasksLoading && !tasks.length) {
    return (
      <div className={cn(theme.layout.page, theme.spacing.p.lg)}>
        <div className={theme.layout.flex.center}>
          <div className={cn(theme.animation.spin, 'w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full')} />
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================

  if (tasksError) {
    return (
      <div className={cn(theme.layout.page, theme.spacing.p.lg)}>
        <div className={cn(theme.card.base, theme.spacing.p.lg, 'text-center')}>
          <div className={cn(theme.badge.error, 'inline-flex mb-4')}>
            ❌ Errore di caricamento
          </div>
          <p className={theme.typography.body}>
            {tasksError.message || 'Impossibile caricare i task'}
          </p>
          <button
            onClick={refetchTasks}
            className={cn(theme.button.primary, theme.button.size.md, 'mt-4')}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ==================== VIEW MODES ====================

  const viewModes = [
    { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
    { value: 'list', label: 'Lista', icon: LayoutList },
    { value: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { value: 'stats', label: 'Statistiche', icon: PieChart },
  ];

  // ==================== RENDER ====================

  return (
    <div className={cn(theme.layout.page, theme.spacing.p.lg)}>
      {/* Header */}
      <div className={cn(theme.layout.flex.between, theme.spacing.mb.lg)}>
        <div>
          <h1 className={theme.typography.h1}>Dashboard</h1>
          <p className={cn(theme.typography.body, theme.colors.text.muted)}>
            Benvenuto, {user.name}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className={cn(theme.button.primary, theme.button.size.lg)}
          disabled={creating}
        >
          <Plus className="w-5 h-5" />
          Nuovo Task
        </button>
      </div>

      {/* Stats Cards */}
      <div className={cn(theme.layout.grid.cols4, theme.spacing.mb.lg)}>
        <div className={cn(theme.card.base, theme.spacing.p.md)}>
          <p className={theme.typography.caption}>Totale</p>
          <p className={cn(theme.typography.h2, theme.colors.text.accent)}>{stats.total}</p>
        </div>

        <div className={cn(theme.card.base, theme.spacing.p.md)}>
          <p className={theme.typography.caption}>In Corso</p>
          <p className={cn(theme.typography.h2, theme.colors.status.info.text)}>{stats.in_progress}</p>
        </div>

        <div className={cn(theme.card.base, theme.spacing.p.md)}>
          <p className={theme.typography.caption}>Completati</p>
          <p className={cn(theme.typography.h2, theme.colors.status.success.text)}>{stats.completed}</p>
        </div>

        <div className={cn(theme.card.base, theme.spacing.p.md)}>
          <p className={theme.typography.caption}>Bloccati</p>
          <p className={cn(theme.typography.h2, theme.colors.status.error.text)}>{stats.blocked}</p>
        </div>
      </div>

      {/* Alerts */}
      {overdueTasks.length > 0 && (
        <div className={cn(theme.badge.error, theme.spacing.p.md, theme.spacing.mb.lg, 'block')}>
          🚨 Hai {overdueTasks.length} task in ritardo
        </div>
      )}

      {/* View Mode Selector */}
      <div className={cn(theme.layout.flex.start, theme.spacing.gap.sm, theme.spacing.mb.lg)}>
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.value;

          return (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={cn(
                isActive ? theme.button.primary : theme.button.secondary,
                theme.button.size.md
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content based on view mode */}
      <div>
        {viewMode === 'kanban' && (
          <KanbanBoard
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
          />
        )}

        {viewMode === 'list' && (
          <div className={theme.layout.section.base}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
              />
            ))}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className={cn(theme.card.base, theme.spacing.p.lg)}>
            {/* TODO: TaskCalendar component */}
            <p className={theme.typography.body}>Vista calendario (TODO)</p>
          </div>
        )}

        {viewMode === 'stats' && (
          <div className={cn(theme.card.base, theme.spacing.p.lg)}>
            {/* TODO: Charts */}
            <p className={theme.typography.body}>Statistiche (TODO)</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => handleTaskUpdate(selectedTask.id, updates)}
        />
      )}

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
          projects={projects}
        />
      )}
    </div>
  );
}
