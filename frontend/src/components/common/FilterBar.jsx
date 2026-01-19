import { useState, useEffect } from 'react';
import { Calendar, User, FolderKanban, Filter } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { usersApi, projectsApi } from '../../services/api';

const FilterBar = ({ filters, onFilterChange, showEmployeeFilter = false }) => {
  const { colors, spacing } = useTheme();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFilterData();
  }, []);

  const loadFilterData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        showEmployeeFilter ? usersApi.getAll({ active: true }) : Promise.resolve({ data: [] }),
        projectsApi.getAll(),
      ]);

      setUsers(usersRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Errore caricamento filtri:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeRanges = [
    { value: 'all', label: 'Tutto' },
    { value: 'today', label: 'Oggi' },
    { value: 'week', label: 'Settimana' },
    { value: 'month', label: 'Mese' },
  ];

  const statuses = [
    { value: 'all', label: 'Tutti gli stati' },
    { value: 'todo', label: 'Da fare' },
    { value: 'in_progress', label: 'In corso' },
    { value: 'blocked', label: 'Bloccato' },
    { value: 'waiting_clarification', label: 'In attesa' },
    { value: 'completed', label: 'Completato' },
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  if (isLoading) {
    return (
      <div className={`${colors.bg.primary} ${colors.border} border-2 rounded-lg ${spacing.cardP} mb-6 flex items-center justify-center`}>
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-cyan-500"></div>
        <span className={`ml-2 font-medium text-cyan-400/70`}>Caricamento filtri...</span>
      </div>
    );
  }

  return (
    <div className={`${colors.bg.primary} ${colors.border} border-2 rounded-lg ${spacing.cardP} mb-6`}>
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5 text-cyan-400" />
        <h3 className={`font-bold text-lg ${colors.text.primary}`}>Filtri</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Filtro Temporale */}
        <div>
          <label className={`${colors.text.secondary} mb-2 flex items-center gap-2 text-sm font-semibold`}>
            <Calendar className="h-4 w-4" />
            Periodo
          </label>
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Dipendente (solo per direzione) */}
        {showEmployeeFilter && (
          <div>
            <label className={`${colors.text.secondary} flex items-center gap-2 text-sm font-semibold`}>
              <User className="h-4 w-4" />
              Dipendente
            </label>
            <select
              value={filters.userId || 'all'}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
            >
              <option value="all">Tutti i dipendenti</option>
              {users
                .filter((u) => u.role === 'dipendente')
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Filtro Progetto */}
        <div>
          <label className={`${colors.text.secondary} flex items-center gap-2 text-sm font-semibold`}>
            <FolderKanban className="h-4 w-4" />
            Progetto
          </label>
          <select
            value={filters.projectId || 'all'}
            onChange={(e) => handleFilterChange('projectId', e.target.value)}
            className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
          >
            <option value="all">Tutti i progetti</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Stato */}
        <div>
          <label className={`${colors.text.secondary} flex items-center gap-2 text-sm font-semibold`}>
            <Filter className="h-4 w-4" />
            Stato
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={`w-full rounded-lg px-3 py-2 ${colors.bg.secondary} ${colors.text.primary} ${colors.border} border-2 transition-all focus:ring-2 focus:ring-cyan-500`}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset Filters Button */}
      {(filters.timeRange !== 'all' ||
        filters.userId !== 'all' ||
        filters.projectId !== 'all' ||
        filters.status !== 'all') && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() =>
              onFilterChange({
                timeRange: 'all',
                userId: 'all',
                projectId: 'all',
                status: 'all',
              })
            }
            className={`text-sm font-medium ${colors.accent} hover:text-cyan-600`}
          >
            Reset filtri
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
