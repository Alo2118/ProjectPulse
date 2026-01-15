import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Edit2, Trash2, Download, BarChart3, TrendingUp, Users as UsersIcon, X } from 'lucide-react';
import { timeApi, projectsApi, tasksApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatDate, formatDateTime } from '../utils/helpers';

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
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-slide-right">
          <div>
            <h1 className="page-title flex items-center gap-2">⏱️ Monitoraggio Tempo</h1>
            <p className="text-slate-600 mt-0.5 text-xs">
              Registrazioni di tempo di lavoro
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportToCSV} className="btn-secondary flex items-center gap-1.5 text-sm py-2 hover-scale">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button onClick={() => { setSelectedEntry(null); setShowManualModal(true); }} className="btn-primary flex items-center gap-1.5 text-sm py-2 hover-scale">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Manuale</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="stats-grid-compact mb-4">
            <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-primary-600">Tempo Totale</div>
                  <div className="text-2xl font-bold text-primary-900 mt-1">
                    {formatTime(statistics.overall.total_seconds)}
                  </div>
                </div>
                <Clock className="w-10 h-10 text-primary-600 opacity-50" />
              </div>
            </div>

            <div className="card-stat from-primary-50 to-primary-100 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-600">Registrazioni</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {statistics.overall.total_entries}
                  </div>
                </div>
                <BarChart3 className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-600">Media per Sessione</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {formatTime(statistics.overall.avg_seconds)}
                  </div>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-purple-600">Task Lavorati</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {statistics.overall.total_tasks}
                  </div>
                </div>
                <UsersIcon className="w-10 h-10 text-purple-600 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Time by Project */}
        {statistics?.by_project && statistics.by_project.length > 0 && (
          <div className="card mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tempo per Progetto</h3>
            <div className="space-y-4">
              {statistics.by_project.map((project) => {
                const percentage = statistics.overall.total_seconds > 0
                  ? (project.total_seconds / statistics.overall.total_seconds) * 100
                  : 0;
                return (
                  <div key={project.project_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{project.project_name}</span>
                      <span className="text-sm text-gray-600">
                        {formatTime(project.total_seconds)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time by User (Admin only) */}
        {isAmministratore && statistics?.by_user && statistics.by_user.length > 0 && (
          <div className="card mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tempo per Utente</h3>
            <div className="space-y-4">
              {statistics.by_user.map((userStat) => {
                const percentage = statistics.overall.total_seconds > 0
                  ? (userStat.total_seconds / statistics.overall.total_seconds) * 100
                  : 0;
                return (
                  <div key={userStat.user_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{userStat.user_name}</span>
                      <span className="text-sm text-gray-600">
                        {formatTime(userStat.total_seconds)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtri</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Da
              </label>
              <input
                type="date"
                className="input"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                A
              </label>
              <input
                type="date"
                className="input"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progetto
              </label>
              <select
                className="input"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utente
                </label>
                <select
                  className="input"
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
        </div>

        {/* Time Entries List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Registrazioni Tempo ({timeEntries.length})
          </h3>

          {timeEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna registrazione</h3>
              <p className="text-gray-500">Non ci sono registrazioni di tempo per i filtri selezionati</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progetto</th>
                    {isAmministratore && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utente</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inizio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fine</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durata</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(entry.started_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.task_title || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.project_name || '-'}
                      </td>
                      {isAmministratore && (
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {entry.user_name || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {new Date(entry.started_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : (
                          <span className="text-blue-600 font-medium">In corso</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.duration ? formatTime(entry.duration) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        {entry.ended_at && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => { setSelectedEntry(entry); setShowManualModal(true); }}
                              className="text-primary-600 hover:text-primary-900"
                              title="Modifica"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="text-red-600 hover:text-red-900"
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
        </div>
      </div>

      {/* Manual Entry Modal - placeholder, will be created separately */}
      {showManualModal && (
        <ManualTimeEntryModal
          entry={selectedEntry}
          onClose={() => { setShowManualModal(false); setSelectedEntry(null); }}
          onSave={loadData}
        />
      )}
    </div>
  );
}

// Placeholder component - will be implemented separately
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {entry ? 'Modifica Registrazione' : 'Nuova Registrazione Manuale'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task *
            </label>
            <select
              className="input"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utente *
              </label>
              <select
                className="input"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inizio *
              </label>
              <input
                type="datetime-local"
                className="input"
                value={formData.started_at}
                onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fine *
              </label>
              <input
                type="datetime-local"
                className="input"
                value={formData.ended_at}
                onChange={(e) => setFormData({ ...formData, ended_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              className="input"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Aggiungi note opzionali..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Salvataggio...' : entry ? 'Salva Modifiche' : 'Crea Registrazione'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
