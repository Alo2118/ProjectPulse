import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Download,
  BarChart3,
  TrendingUp,
  Users as UsersIcon,
  X,
  Timer as TimerIcon,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import theme, { cn } from '../styles/theme';
import { timeApi, projectsApi, tasksApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatDate, formatDateTime } from '../utils/helpers';
import { useToast } from '../context/ToastContext';
import {
  GamingLayout,
  GamingHeader,
  GamingCard,
  GamingLoader,
  GamingKPICard,
  GamingKPIGrid,
  Button,
} from '../components/ui';

export default function TimeTrackingPage() {
  const { user, isAmministratore } = useAuth();
  const { colors, spacing } = useTheme();
  const { error: showError } = useToast();
  const [timeEntries, setTimeEntries] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    to_date: new Date().toISOString().split('T')[0],
    project_id: '',
    user_id: '',
  });

  useEffect(() => {
    loadProjects();
    if (isAmministratore) {
      loadUsers();
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll({ active: true });
      setUsers(response.data.filter((u) => u.role !== 'direzione'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, statsRes] = await Promise.all([
        timeApi.getEntries(filters),
        timeApi.getStatistics(filters),
      ]);
      setTimeEntries(entriesRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Eliminare questa registrazione di ${formatTime(entry.duration)}?`)) {
      return;
    }

    try {
      await timeApi.delete(entry.id);
      loadData();
    } catch (error) {
      showError(error.response?.data?.error || "Errore durante l'eliminazione");
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Inizio', 'Fine', 'Durata', 'Task', 'Progetto', 'Utente', 'Note'];
    const rows = timeEntries.map((entry) => [
      formatDate(entry.started_at),
      new Date(entry.started_at).toLocaleTimeString('it-IT'),
      entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString('it-IT') : 'In corso',
      entry.duration ? formatTime(entry.duration) : '-',
      entry.task_title || '-',
      entry.project_name || '-',
      entry.user_name || `${user.first_name} ${user.last_name}`,
      entry.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time_tracking_${filters.from_date}_${filters.to_date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !statistics) {
    return <GamingLoader message="Caricamento dati tempo..." />;
  }

  return (
    <GamingLayout>
      <GamingHeader
        title="Monitoraggio Tempo"
        subtitle="Registrazioni di tempo di lavoro"
        icon={TimerIcon}
        actions={
          <>
            <Button onClick={exportToCSV} variant="secondary">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              onClick={() => {
                setSelectedEntry(null);
                setShowManualModal(true);
              }}
              variant="primary"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Manuale</span>
            </Button>
          </>
        }
      />

      {/* Statistics Cards */}
      {statistics && (
        <GamingKPIGrid columns={4}>
          <GamingKPICard
            title="Tempo Totale"
            value={formatTime(statistics.overall.total_seconds)}
            icon={Clock}
            gradient="from-orange-600 to-red-700"
            shadowColor="orange"
          />
          <GamingKPICard
            title="Registrazioni"
            value={statistics.overall.total_entries}
            icon={BarChart3}
            gradient="from-blue-600 to-cyan-700"
            shadowColor="blue"
          />
          <GamingKPICard
            title="Media per Sessione"
            value={formatTime(statistics.overall.avg_seconds)}
            icon={TrendingUp}
            gradient="from-emerald-600 to-green-700"
            shadowColor="emerald"
          />
          <GamingKPICard
            title="Task Lavorati"
            value={statistics.overall.total_tasks}
            icon={UsersIcon}
            gradient="from-purple-600 to-pink-700"
            shadowColor="purple"
          />
        </GamingKPIGrid>
      )}

      {/* Time by Project */}
      {statistics?.by_project && statistics.by_project.length > 0 && (
        <GamingCard>
          <div className={cn(theme.spacing.mb.lg, "flex", "items-center", theme.spacing.gap.sm)}>
            <BarChart3 className={cn("h-6", "w-6", theme.colors.text.accentBright)} />
            <h3 className="card-header">Tempo per Progetto</h3>
          </div>
          <div className="space-y-4">
            {statistics.by_project.map((project) => {
              const percentage =
                statistics.overall.total_seconds > 0
                  ? (project.total_seconds / statistics.overall.total_seconds) * 100
                  : 0;
              return (
                <div key={project.project_id}>
                  <div className={cn(theme.spacing.mb.xs, "flex", "items-center", "justify-between")}>
                    <span className={cn("text-sm", "font-bold", theme.colors.text.primary)}>{project.project_name}</span>
                    <span className={cn("text-sm", "font-bold", theme.colors.text.accent)}>
                      {formatTime(project.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={cn("h-3", "w-full", "overflow-hidden", "rounded-full", "border", theme.colors.border.accentAlpha, theme.colors.bg.tertiary, "shadow-inner")}>
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-600 shadow-cyan-500/40 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GamingCard>
      )}

      {/* Time by User (Admin only) */}
      {isAmministratore && statistics?.by_user && statistics.by_user.length > 0 && (
        <GamingCard>
          <div className={cn(theme.spacing.mb.lg, "flex", "items-center", theme.spacing.gap.sm)}>
            <UsersIcon className={cn("h-6", "w-6", theme.colors.text.accentBright)} />
            <h3 className="card-header">Tempo per Utente</h3>
          </div>
          <div className="space-y-4">
            {statistics.by_user.map((userStat) => {
              const percentage =
                statistics.overall.total_seconds > 0
                  ? (userStat.total_seconds / statistics.overall.total_seconds) * 100
                  : 0;
              return (
                <div key={userStat.user_id}>
                  <div className={cn(theme.spacing.mb.xs, "flex", "items-center", "justify-between")}>
                    <span className={cn("text-sm", "font-bold", theme.colors.text.primary)}>{userStat.user_name}</span>
                    <span className={cn("text-sm", "font-bold", theme.colors.text.accentBright)}>
                      {formatTime(userStat.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={cn("h-3", "w-full", "overflow-hidden", "rounded-full", "border", theme.colors.border.accentAlpha, theme.colors.bg.tertiary, "shadow-inner")}>
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-500 dark:to-blue-600 shadow-cyan-500/40 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GamingCard>
      )}

      {/* Filters */}
      <GamingCard>
        <div className={cn(theme.spacing.mb.lg, "flex", "items-center", theme.spacing.gap.sm)}>
          <Clock className={cn("h-6", "w-6", theme.colors.text.accentBright)} />
          <h3 className="card-header">Filtri</h3>
        </div>
        <div className={cn("grid", "grid-cols-1", theme.spacing.gap.md, "md:grid-cols-4")}>
          <div>
            <label className={cn("text-label", theme.spacing.mb.xs)}>Da</label>
            <input
              type="date"
              className="input-dark w-full"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className={cn("text-label", theme.spacing.mb.xs)}>A</label>
            <input
              type="date"
              className="input-dark w-full"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            />
          </div>
          <div>
            <label className={cn("text-label", theme.spacing.mb.xs)}>Progetto</label>
            <select
              className="input-dark w-full"
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
            >
              <option value="">Tutti i progetti</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {isAmministratore && (
            <div>
              <label className={cn("text-label", theme.spacing.mb.xs)}>Utente</label>
              <select
                className="input-dark w-full"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              >
                <option value="">Tutti gli utenti</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GamingCard>

      {/* Time Entries List */}
      <GamingCard>
        <div className={cn(theme.spacing.mb.lg, "flex", "items-center", theme.spacing.gap.sm)}>
          <TimerIcon className={cn("h-6", "w-6", theme.colors.text.accentBright)} />
          <h3 className="card-header">Registrazioni Tempo ({timeEntries.length})</h3>
        </div>

        {timeEntries.length === 0 ? (
          <div className={cn(theme.spacing.py.xl, "text-center", theme.colors.text.secondary)}>
            <Clock className={cn("mx-auto", theme.spacing.mb.md, "h-16", "w-16", theme.colors.text.accentBright)} />
            <h3 className={cn(theme.spacing.mb.xs, "text-lg", "font-bold", theme.colors.text.primary)}>Nessuna registrazione</h3>
            <p className={theme.colors.text.tertiary}>
              Non ci sono registrazioni di tempo per i filtri selezionati
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={cn("border-b", theme.colors.border.accentAlpha, theme.colors.bg.secondary)}>
                <tr>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Data
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Task
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Progetto
                  </th>
                  {isAmministratore && (
                    <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                      Utente
                    </th>
                  )}
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Inizio
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Fine
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Durata
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-left", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Note
                  </th>
                  <th className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-right", "text-xs", "font-bold", "uppercase", "tracking-wide", theme.colors.text.primary)}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", theme.colors.border.default)}>
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className={cn("transition-colors", theme.colors.bg.hover)}>
                    <td className={cn("whitespace-nowrap", theme.spacing.px.md, theme.spacing.py.sm, "text-sm", "font-semibold", theme.colors.text.primary)}>
                      {formatDate(entry.started_at)}
                    </td>
                    <td className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.primary)}>{entry.task_title || '-'}</td>
                    <td className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.secondary)}>
                      {entry.project_name || '-'}
                    </td>
                    {isAmministratore && (
                      <td className={cn(theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.secondary)}>{entry.user_name || '-'}</td>
                    )}
                    <td className={cn("whitespace-nowrap", theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.secondary)}>
                      {new Date(entry.started_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={cn("whitespace-nowrap", theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.secondary)}>
                      {entry.ended_at ? (
                        new Date(entry.ended_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className={cn("font-bold", theme.colors.text.accent)}>In corso</span>
                      )}
                    </td>
                    <td className={cn("whitespace-nowrap", theme.spacing.px.md, theme.spacing.py.sm, "text-sm", "font-bold", theme.colors.text.primary)}>
                      {entry.duration ? formatTime(entry.duration) : '-'}
                    </td>
                    <td className={cn("max-w-xs", "truncate", theme.spacing.px.md, theme.spacing.py.sm, "text-sm", theme.colors.text.secondary)}>
                      {entry.notes || '-'}
                    </td>
                    <td className={cn("whitespace-nowrap", theme.spacing.px.md, theme.spacing.py.sm, "text-right", "text-sm", "font-medium")}>
                      {entry.ended_at && (
                        <div className={cn("flex", "justify-end", theme.spacing.gap.sm)}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowManualModal(true);
                            }}
                            className={cn(theme.colors.text.accent, "hover:text-cyan-300")}
                            title="Modifica"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(entry)}
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GamingCard>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <ManualTimeEntryModal
          entry={selectedEntry}
          onClose={() => {
            setShowManualModal(false);
            setSelectedEntry(null);
          }}
          onSave={loadData}
        />
      )}
    </GamingLayout>
  );
}

// Gaming-styled Manual Time Entry Modal
function ManualTimeEntryModal({ entry, onClose, onSave }) {
  const { user, isAmministratore } = useAuth();
  const { colors } = useTheme();
  const { error: showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    task_id: entry?.task_id || '',
    user_id: entry?.user_id || user.id,
    started_at: entry?.started_at ? new Date(entry.started_at).toISOString().slice(0, 16) : '',
    ended_at: entry?.ended_at ? new Date(entry.ended_at).toISOString().slice(0, 16) : '',
    notes: entry?.notes || '',
  });

  useEffect(() => {
    loadTasks();
    if (isAmministratore) {
      loadUsers();
    }
  }, []);

  const loadTasks = async () => {
    try {
      const response = await tasksApi.getAll();
      // Handle paginated response from tasks API
      const tasksData = response.data.data || response.data;
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll({ active: true });
      setUsers(response.data.filter((u) => u.role !== 'direzione'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (entry) {
        // Update existing entry
        await timeApi.update(entry.id, formData);
      } else {
        // Create new entry
        await timeApi.createManual(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      showError(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/50", theme.spacing.p.md, "backdrop-blur-sm")}>
      <GamingCard className={cn("w-full", "max-w-lg", theme.spacing.p.lg, "shadow-2xl")}>
        {/* Header */}
        <div className={cn(theme.spacing.mb.lg, "flex", "items-center", "justify-between", "border-b-2", theme.colors.border.accentAlpha, theme.spacing.pb.md)}>
          <h2 className={cn("flex", "items-center", theme.spacing.gap.sm, "text-2xl", "font-bold", theme.colors.text.accent)}>
            <Clock className={cn("h-7", "w-7", theme.colors.text.accentBright)} />
            {entry ? 'Modifica Registrazione' : 'Nuova Registrazione Manuale'}
          </h2>
          <button
            onClick={onClose}
            className={cn(theme.colors.text.muted, "transition-colors", "hover:text-cyan-300")}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={cn("text-label", theme.spacing.mb.xs)}>Task *</label>
            <select
              className="input-dark w-full"
              value={formData.task_id}
              onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
              required
            >
              <option value="">Seleziona task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} {task.project_name && `- ${task.project_name}`}
                </option>
              ))}
            </select>
          </div>

          {isAmministratore && (
            <div>
              <label className={cn("text-label", theme.spacing.mb.xs)}>Utente *</label>
              <select
                className="input-dark w-full"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={cn("grid", "grid-cols-2", theme.spacing.gap.md)}>
            <div>
              <label className={cn("text-label", theme.spacing.mb.xs)}>Inizio *</label>
              <input
                type="datetime-local"
                className="input-dark w-full"
                value={formData.started_at}
                onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={cn("text-label", theme.spacing.mb.xs)}>Fine *</label>
              <input
                type="datetime-local"
                className="input-dark w-full"
                value={formData.ended_at}
                onChange={(e) => setFormData({ ...formData, ended_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className={cn("text-label", theme.spacing.mb.xs)}>Note</label>
            <textarea
              className="textarea-dark w-full resize-none"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Aggiungi note opzionali..."
            />
          </div>

          {/* Footer */}
          <div className={cn("flex", theme.spacing.gap.sm, "border-t-2", theme.colors.border.accentAlpha, theme.spacing.pt.md)}>
            <Button type="button" onClick={onClose} variant="secondary" className="flex-1">
              Annulla
            </Button>
            <Button type="submit" disabled={loading} variant="primary" className="flex-1">
              {loading ? 'Salvataggio...' : entry ? 'Salva Modifiche' : 'Crea Registrazione'}
            </Button>
          </div>
        </form>
      </GamingCard>
    </div>
  );
}
