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
import { designTokens } from '../config/designTokens';
import { timeApi, projectsApi, tasksApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatDate, formatDateTime } from '../utils/helpers';
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
      alert('Errore nel caricamento dei dati');
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
      alert(error.response?.data?.error || "Errore durante l'eliminazione");
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
          <div className="mb-6 flex items-center gap-3">
            <BarChart3 className={`h-6 w-6 ${designTokens.colors.cyan.text}`} />
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
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-bold ${colors.text.primary}`}>{project.project_name}</span>
                    <span className={`text-sm font-bold ${colors.text.accent}`}>
                      {formatTime(project.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`h-3 w-full overflow-hidden rounded-full border ${designTokens.colors.cyan.borderLight} ${colors.bg.tertiary} shadow-inner`}>
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
          <div className="mb-6 flex items-center gap-3">
            <UsersIcon className={`h-6 w-6 ${designTokens.colors.cyan.text}`} />
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
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`text-sm font-bold ${colors.text.primary}`}>{userStat.user_name}</span>
                    <span className={`text-sm font-bold ${designTokens.colors.cyan.text}`}>
                      {formatTime(userStat.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`h-3 w-full overflow-hidden rounded-full border ${designTokens.colors.cyan.borderLight} ${colors.bg.tertiary} shadow-inner`}>
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
        <div className="mb-6 flex items-center gap-3">
          <Clock className={`h-6 w-6 ${designTokens.colors.cyan.text}`} />
          <h3 className="card-header">Filtri</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="text-label mb-1">Da</label>
            <input
              type="date"
              className="input-dark w-full"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-label mb-1">A</label>
            <input
              type="date"
              className="input-dark w-full"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-label mb-1">Progetto</label>
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
              <label className="text-label mb-1">Utente</label>
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
        <div className="mb-6 flex items-center gap-3">
          <TimerIcon className={`h-6 w-6 ${designTokens.colors.cyan.text}`} />
          <h3 className="card-header">Registrazioni Tempo ({timeEntries.length})</h3>
        </div>

        {timeEntries.length === 0 ? (
          <div className={`py-16 text-center ${colors.text.secondary}`}>
            <Clock className={`mx-auto mb-4 h-16 w-16 ${designTokens.colors.cyan.text}`} />
            <h3 className={`mb-2 text-lg font-bold ${colors.text.primary}`}>Nessuna registrazione</h3>
            <p className={colors.text.tertiary}>
              Non ci sono registrazioni di tempo per i filtri selezionati
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`border-b ${designTokens.colors.cyan.borderLight} ${colors.bg.secondary}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Data
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Task
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Progetto
                  </th>
                  {isAmministratore && (
                    <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                      Utente
                    </th>
                  )}
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Inizio
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Fine
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Durata
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Note
                  </th>
                  <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wide ${colors.text.primary}`}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${colors.border}`}>
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className={`transition-colors ${colors.bg.hover}`}>
                    <td className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${colors.text.primary}`}>
                      {formatDate(entry.started_at)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${colors.text.primary}`}>{entry.task_title || '-'}</td>
                    <td className={`px-4 py-3 text-sm ${colors.text.secondary}`}>
                      {entry.project_name || '-'}
                    </td>
                    {isAmministratore && (
                      <td className={`px-4 py-3 text-sm ${colors.text.secondary}`}>{entry.user_name || '-'}</td>
                    )}
                    <td className={`whitespace-nowrap px-4 py-3 text-sm ${colors.text.secondary}`}>
                      {new Date(entry.started_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-sm ${colors.text.secondary}`}>
                      {entry.ended_at ? (
                        new Date(entry.ended_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      ) : (
                        <span className={`font-bold ${colors.text.accent}`}>In corso</span>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-sm font-bold ${colors.text.primary}`}>
                      {entry.duration ? formatTime(entry.duration) : '-'}
                    </td>
                    <td className={`max-w-xs truncate px-4 py-3 text-sm ${colors.text.secondary}`}>
                      {entry.notes || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      {entry.ended_at && (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setShowManualModal(true);
                            }}
                            className={`${colors.text.accent} hover:${colors.text.primary}`}
                            title="Modifica"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(entry)}
                            className={`${designTokens.colors.error.text} ${designTokens.colors.error.textLight}`}
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
      alert(error.response?.data?.error || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <GamingCard className="w-full max-w-lg p-6 shadow-2xl">
        {/* Header */}
        <div className={`mb-6 flex items-center justify-between border-b-2 ${designTokens.colors.cyan.borderLight} pb-4`}>
          <h2 className={`flex items-center gap-3 text-2xl font-bold ${designTokens.colors.cyan.text}`}>
            <Clock className={`h-7 w-7 ${designTokens.colors.cyan.text}`} />
            {entry ? 'Modifica Registrazione' : 'Nuova Registrazione Manuale'}
          </h2>
          <button
            onClick={onClose}
            className={`${colors.text.tertiary} transition-colors hover:${colors.text.accent}`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-label mb-1">Task *</label>
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
              <label className="text-label mb-1">Utente *</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label mb-1">Inizio *</label>
              <input
                type="datetime-local"
                className="input-dark w-full"
                value={formData.started_at}
                onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-label mb-1">Fine *</label>
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
            <label className="text-label mb-1">Note</label>
            <textarea
              className="textarea-dark w-full resize-none"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Aggiungi note opzionali..."
            />
          </div>

          {/* Footer */}
          <div className={`flex gap-3 border-t-2 ${designTokens.colors.cyan.borderLight} pt-4`}>
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
