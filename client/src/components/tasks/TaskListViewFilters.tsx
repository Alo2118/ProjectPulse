/**
 * TaskListViewFilters — Filter bar for the Task List page.
 * Contains: search, project/priority/department dropdowns,
 * reset button, show-all checkbox, view-mode toggle, and
 * an "Filtro avanzato" toggle button.
 * @module components/tasks/TaskListViewFilters
 */

import { Search, List, FolderTree, Table2, X, SlidersHorizontal } from 'lucide-react'

export interface TaskListViewFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  priorityFilter: string
  onPriorityFilterChange: (value: string) => void
  projectFilter: string
  onProjectFilterChange: (value: string) => void
  departmentFilter: string
  onDepartmentFilterChange: (value: string) => void
  showAll: boolean
  onShowAllChange: (value: boolean) => void
  viewMode: 'list' | 'tree' | 'table'
  onViewModeChange: (mode: 'list' | 'tree' | 'table') => void
  isAdmin: boolean
  projects: Array<{ id: string; name: string }>
  departments: Array<{ id: string; name: string; isActive: boolean }>
  activeFilterCount: number
  onResetFilters: () => void
  /** Whether the advanced filter panel is currently shown */
  showAdvancedFilter: boolean
  onToggleAdvancedFilter: () => void
  /** Number of active advanced filter rules (for badge) */
  advancedFilterRuleCount: number
}

export function TaskListViewFilters({
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  projectFilter,
  onProjectFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  showAll,
  onShowAllChange,
  viewMode,
  onViewModeChange,
  isAdmin,
  projects,
  departments,
  activeFilterCount,
  onResetFilters,
  showAdvancedFilter,
  onToggleAdvancedFilter,
  advancedFilterRuleCount,
}: TaskListViewFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-52">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Cerca task..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-10 py-2 text-sm"
          aria-label="Cerca task"
        />
      </div>

      {/* Project filter */}
      <select
        value={projectFilter}
        onChange={(e) => onProjectFilterChange(e.target.value)}
        className="input w-auto py-2 text-sm"
        aria-label="Filtra per progetto"
      >
        <option value="">Tutti i progetti</option>
        <option value="standalone">Standalone</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {/* Priority filter */}
      <select
        value={priorityFilter}
        onChange={(e) => onPriorityFilterChange(e.target.value)}
        className="input w-auto py-2 text-sm"
        aria-label="Filtra per priorità"
      >
        <option value="">Tutte le priorità</option>
        <option value="critical">Critica</option>
        <option value="high">Alta</option>
        <option value="medium">Media</option>
        <option value="low">Bassa</option>
      </select>

      {/* Department filter */}
      {departments.length > 0 && (
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentFilterChange(e.target.value)}
          className="input w-auto py-2 text-sm"
          aria-label="Filtra per reparto"
        >
          <option value="">Tutti i reparti</option>
          {departments
            .filter((d) => d.isActive)
            .map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
        </select>
      )}

      {/* Reset filters button */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Resetta tutti i filtri"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Resetta filtri
          <span className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-xs font-medium">
            {activeFilterCount}
          </span>
        </button>
      )}

      {/* Show all (admin/direzione) */}
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer ml-1 select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => onShowAllChange(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          Mostra tutti
        </label>
      )}

      {/* Advanced filter toggle button */}
      <button
        type="button"
        onClick={onToggleAdvancedFilter}
        className={[
          'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors',
          showAdvancedFilter || advancedFilterRuleCount > 0
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/60'
            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
        ].join(' ')}
        aria-pressed={showAdvancedFilter}
        aria-label={showAdvancedFilter ? 'Nascondi filtro avanzato' : 'Mostra filtro avanzato'}
        title="Filtro avanzato con regole AND/OR"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Filtro avanzato</span>
        {advancedFilterRuleCount > 0 && (
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-primary-500 text-white text-xs font-medium">
            {advancedFilterRuleCount}
          </span>
        )}
      </button>

      {/* Segmented view mode control — pushed to the right */}
      <div
        className="segmented-control ml-auto"
        role="group"
        aria-label="Modalità di visualizzazione"
      >
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={`segmented-control-item flex items-center gap-1.5 ${viewMode === 'list' ? 'segmented-control-item-active' : ''}`}
          aria-pressed={viewMode === 'list'}
          title="Vista Lista"
        >
          <List className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lista</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('tree')}
          className={`segmented-control-item flex items-center gap-1.5 ${viewMode === 'tree' ? 'segmented-control-item-active' : ''}`}
          aria-pressed={viewMode === 'tree'}
          title="Vista Albero"
        >
          <FolderTree className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Albero</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('table')}
          className={`segmented-control-item flex items-center gap-1.5 ${viewMode === 'table' ? 'segmented-control-item-active' : ''}`}
          aria-pressed={viewMode === 'table'}
          title="Vista Tabella"
        >
          <Table2 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Tabella</span>
        </button>
      </div>
    </div>
  )
}
