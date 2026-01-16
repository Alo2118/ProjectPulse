import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Edit2, Trash2, Download, BarChart3, TrendingUp, Users as UsersIcon, X, Timer as TimerIcon } from 'lucide-react';
import { timeApi, projectsApi, tasksApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatDate, formatDateTime } from '../utils/helpers';
import { 
  GamingLayout, GamingHeader, GamingCard, GamingLoader,
  GamingKPICard, GamingKPIGrid, Button 
} from '../components/ui';

export default function TimeTrackingPage() {
  const { user, isAmministratore } = useAuth();
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
    user_id: ''
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
      setUsers(response.data.filter(u => u.role !== 'direzione'));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, statsRes] = await Promise.all([
        timeApi.getEntries(filters),
        timeApi.getStatistics(filters)
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
      alert(error.response?.data?.error || 'Errore durante l\'eliminazione');
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Inizio', 'Fine', 'Durata', 'Task', 'Progetto', 'Utente', 'Note'];
    const rows = timeEntries.map(entry => [
      formatDate(entry.started_at),
      new Date(entry.started_at).toLocaleTimeString('it-IT'),
      entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString('it-IT') : 'In corso',
      entry.duration ? formatTime(entry.duration) : '-',
      entry.task_title || '-',
      entry.project_name || '-',
      entry.user_name || `${user.first_name} ${user.last_name}`,
      entry.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
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
            <Button 
              onClick={exportToCSV} 
              className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button 
              onClick={() => { setSelectedEntry(null); setShowManualModal(true); }}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50 transition-all"
            >
              <Plus className="w-4 h-4" />
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
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            <h3 className="text-lg font-bold text-slate-900">Tempo per Progetto</h3>
          </div>
          <div className="space-y-4">
            {statistics.by_project.map((project) => {
              const percentage = statistics.overall.total_seconds > 0
                ? (project.total_seconds / statistics.overall.total_seconds) * 100
                : 0;
              return (
                <div key={project.project_id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">{project.project_name}</span>
                    <span className="text-sm text-primary-600 font-bold">
                      {formatTime(project.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner border-2 border-primary-300">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-500 h-3 rounded-full transition-all duration-500 shadow-md"
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
          <div className="flex items-center gap-3 mb-6">
            <UsersIcon className="w-6 h-6 text-primary-600" />
            <h3 className="text-lg font-bold text-slate-900">Tempo per Utente</h3>
          </div>
          <div className="space-y-4">
            {statistics.by_user.map((userStat) => {
              const percentage = statistics.overall.total_seconds > 0
                ? (userStat.total_seconds / statistics.overall.total_seconds) * 100
                : 0;
              return (
                <div key={userStat.user_id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">{userStat.user_name}</span>
                    <span className="text-sm text-primary-600 font-bold">
                      {formatTime(userStat.total_seconds)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner border-2 border-primary-300">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-500 h-3 rounded-full transition-all duration-500 shadow-md"
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
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-bold text-slate-900">Filtri</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Da
            </label>
            <input
              type="date"
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              A
            </label>
            <input
              type="date"
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Progetto
            </label>
            <select
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
            >
              <option value="">Tutti i progetti</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {isAmministratore && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Utente
              </label>
              <select
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              >
                <option value="">Tutti gli utenti</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </GamingCard>

      {/* Time Entries List */}
      <GamingCard>
        <div className="flex items-center gap-3 mb-6">
          <TimerIcon className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-bold text-slate-900">
            Registrazioni Tempo ({timeEntries.length})
          </h3>
        </div>

        {timeEntries.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nessuna registrazione</h3>
            <p className="text-slate-600">Non ci sono registrazioni di tempo per i filtri selezionati</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Progetto</th>
                  {isAmministratore && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Utente</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Inizio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Fine</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Durata</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase">Note</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-900 uppercase">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {formatDate(entry.started_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.task_title || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {entry.project_name || '-'}
                    </td>
                    {isAmministratore && (
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {entry.user_name || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {new Date(entry.started_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : (
                        <span className="text-primary-600 font-bold">In corso</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900">
                      {entry.duration ? formatTime(entry.duration) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {entry.ended_at && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setSelectedEntry(entry); setShowManualModal(true); }}
                            className="text-primary-600 hover:text-primary-700 transition-colors"
                            title="Modifica"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="text-red-600 hover:text-red-700 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
          onClose={() => { setShowManualModal(false); setSelectedEntry(null); }}
          onSave={loadData}
        />
      )}
    </GamingLayout>
  );
}

// Gaming-styled Manual Time Entry Modal
function ManualTimeEntryModal({ entry, onClose, onSave }) {
  const { user, isAmministratore } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    task_id: entry?.task_id || '',
    user_id: entry?.user_id || user.id,
    started_at: entry?.started_at ? new Date(entry.started_at).toISOString().slice(0, 16) : '',
    ended_at: entry?.ended_at ? new Date(entry.ended_at).toISOString().slice(0, 16) : '',
    notes: entry?.notes || ''
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
      setUsers(response.data.filter(u => u.role !== 'direzione'));
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <GamingCard className="shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Clock className="w-7 h-7 text-primary-600" />
            {entry ? 'Modifica Registrazione' : 'Nuova Registrazione Manuale'}
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Task *
            </label>
            <select
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
              value={formData.task_id}
              onChange={(e) => setFormData({ ...formData, task_id: e.target.value })}
              required
            >
              <option value="">Seleziona task</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title} {task.project_name && `- ${task.project_name}`}
                </option>
              ))}
            </select>
          </div>

          {isAmministratore && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Utente *
              </label>
              <select
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                required
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Inizio *
              </label>
              <input
                type="datetime-local"
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={formData.started_at}
                onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Fine *
              </label>
              <input
                type="datetime-local"
                className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium"
                value={formData.ended_at}
                onChange={(e) => setFormData({ ...formData, ended_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Note
            </label>
            <textarea
              className="w-full bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all font-medium resize-none"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Aggiungi note opzionali..."
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-all shadow-sm hover:shadow-md"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold shadow-lg shadow-primary-600/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvataggio...' : entry ? 'Salva Modifiche' : 'Crea Registrazione'}
            </Button>
          </div>
        </form>
      </GamingCard>
    </div>
  );
}
