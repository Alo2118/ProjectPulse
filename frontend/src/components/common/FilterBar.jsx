import { useState, useEffect } from 'react';
import { Calendar, User, FolderKanban, Filter } from 'lucide-react';
import { usersApi, projectsApi } from '../../services/api';

const FilterBar = ({ filters, onFilterChange, showEmployeeFilter = false }) => {
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
        projectsApi.getAll()
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
    { value: 'month', label: 'Mese' }
  ];

  const statuses = [
    { value: 'all', label: 'Tutti gli stati' },
    { value: 'todo', label: 'Da fare' },
    { value: 'in_progress', label: 'In corso' },
    { value: 'blocked', label: 'Bloccato' },
    { value: 'waiting_clarification', label: 'In attesa' },
    { value: 'completed', label: 'Completato' }
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  if (isLoading) {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Caricamento filtri...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-800">Filtri</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro Temporale */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Periodo
          </label>
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Dipendente (solo per direzione) */}
        {showEmployeeFilter && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Dipendente
            </label>
            <select
              value={filters.userId || 'all'}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tutti i dipendenti</option>
              {users
                .filter(u => u.role === 'dipendente')
                .map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Filtro Progetto */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FolderKanban className="w-4 h-4" />
            Progetto
          </label>
          <select
            value={filters.projectId || 'all'}
            onChange={(e) => handleFilterChange('projectId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tutti i progetti</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Stato */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Filter className="w-4 h-4" />
            Stato
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
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
            onClick={() => onFilterChange({
              timeRange: 'all',
              userId: 'all',
              projectId: 'all',
              status: 'all'
            })}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset filtri
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
