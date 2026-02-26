/**
 * TaskListViewFilters — Filter bar for the Task List page.
 * Contains: search, project/status dropdowns (primary), priority/department/advanced (secondary),
 * reset button, show-all checkbox, and view-mode toggle.
 * @module components/tasks/TaskListViewFilters
 */

import { useState, useRef, useEffect } from 'react'
import {
  Search,
  List,
  FolderTree,
  Table2,
  X,
  SlidersHorizontal,
  LayoutGrid,
  GanttChartSquare,
  CalendarDays,
  ChevronDown,
  BookmarkCheck,
} from 'lucide-react'

export type ViewMode = 'list' | 'tree' | 'table' | 'kanban' | 'gantt' | 'calendar'

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
  assigneeFilter?: string
  onAssigneeFilterChange?: (value: string) => void
  showAll: boolean
  onShowAllChange: (value: boolean) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isAdmin: boolean
  projects: Array<{ id: string; name: string }>
  departments: Array<{ id: string; name: string; isActive: boolean }>
  users?: Array<{ id: string; firstName: string; lastName: string }>
  activeFilterCount: number
  onResetFilters: () => void
  /** Whether the advanced filter panel is currently shown */
  showAdvancedFilter: boolean
  onToggleAdvancedFilter: () => void
  /** Number of active advanced filter rules (for badge) */
  advancedFilterRuleCount: number
  /** Saved views panel trigger */
  onShowSavedViews?: () => void
  savedViewCount?: number
}

const VIEW_MODES: Array<{ id: ViewMode; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }> = [
  { id: 'list', label: 'Lista', icon: List },
  { id: 'tree', label: 'Albero', icon: FolderTree },
  { id: 'table', label: 'Tabella', icon: Table2 },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
]

export function TaskListViewFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  projectFilter,
  onProjectFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  showAll,
  onShowAllChange,
  viewMode,
  onViewModeChange,
  isAdmin,
  projects,
  departments,
  users,
  activeFilterCount,
  onResetFilters,
  showAdvancedFilter,
  onToggleAdvancedFilter,
  advancedFilterRuleCount,
  onShowSavedViews,
  savedViewCount,
}: TaskListViewFiltersProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const moreFiltersRef = useRef<HTMLDivElement>(null)

  // Close "more filters" popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(e.target as Node)) {
        setShowMoreFilters(false)
      }
    }
    if (showMoreFilters) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreFilters])

  const secondaryFilterCount = [priorityFilter, departmentFilter, assigneeFilter].filter(Boolean).length
    + advancedFilterRuleCount

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* --- Primary filters: always visible --- */}

      {/* Search */}
      <div className="relative flex-1 min-w-52">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none"
          aria-hidden={true}
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

      {/* Status filter (primary) */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="input w-auto py-2 text-sm"
        aria-label="Filtra per stato"
      >
        <option value="">Tutti gli stati</option>
        <option value="todo">Da fare</option>
        <option value="in_progress">In corso</option>
        <option value="review">In revisione</option>
        <option value="blocked">Bloccati</option>
        <option value="done">Completati</option>
      </select>

      {/* Project filter (primary) */}
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

      {/* Assignee filter (primary — only for admin) */}
      {isAdmin && users && users.length > 0 && (
        <select
          value={assigneeFilter ?? ''}
          onChange={(e) => onAssigneeFilterChange?.(e.target.value)}
          className="input w-auto py-2 text-sm"
          aria-label="Filtra per assegnatario"
        >
          <option value="">Tutti gli utenti</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      )}

      {/* --- Secondary filters popover --- */}
      <div className="relative" ref={moreFiltersRef}>
        <button
          type="button"
          onClick={() => setShowMoreFilters((v) => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors',
            showMoreFilters || secondaryFilterCount > 0
              ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
              : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700',
          ].join(' ')}
          aria-expanded={showMoreFilters}
          aria-label="Mostra filtri aggiuntivi"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden={true} />
          <span className="hidden sm:inline">Piu filtri</span>
          {secondaryFilterCount > 0 && (
            <span className="w-4 h-4 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-medium">
              {secondaryFilterCount}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${showMoreFilters ? 'rotate-180' : ''}`}
            aria-hidden={true}
          />
        </button>

        {showMoreFilters && (
          <div
            className="absolute left-0 top-full mt-1 z-50 min-w-72 card p-4 space-y-3 shadow-xl"
            role="dialog"
            aria-label="Filtri aggiuntivi"
          >
            {/* Priority */}
            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Priorita</label>
              <select
                value={priorityFilter}
                onChange={(e) => onPriorityFilterChange(e.target.value)}
                className="input w-full py-2 text-sm"
                aria-label="Filtra per priorita"
              >
                <option value="">Tutte le priorita</option>
                <option value="critical">Critica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Bassa</option>
              </select>
            </div>

            {/* Department */}
            {departments.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Reparto</label>
                <select
                  value={departmentFilter}
                  onChange={(e) => onDepartmentFilterChange(e.target.value)}
                  className="input w-full py-2 text-sm"
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
              </div>
            )}

            {/* Advanced filter builder toggle */}
            <div className="pt-1 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onToggleAdvancedFilter()
                  setShowMoreFilters(false)
                }}
                className={[
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left',
                  showAdvancedFilter || advancedFilterRuleCount > 0
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
                ].join(' ')}
                aria-pressed={showAdvancedFilter}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden={true} />
                Filtro avanzato AND/OR
                {advancedFilterRuleCount > 0 && (
                  <span className="ml-auto w-4 h-4 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-medium">
                    {advancedFilterRuleCount}
                  </span>
                )}
              </button>

              {onShowSavedViews && (
                <button
                  type="button"
                  onClick={() => {
                    onShowSavedViews()
                    setShowMoreFilters(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors text-left text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" aria-hidden={true} />
                  Viste salvate
                  {savedViewCount != null && savedViewCount > 0 && (
                    <span className="ml-auto text-xs text-slate-400">({savedViewCount})</span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Show all (admin/direzione) */}
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer ml-1 select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => onShowAllChange(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="hidden sm:inline">Mostra tutti</span>
        </label>
      )}

      {/* Reset filters button */}
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Resetta tutti i filtri"
        >
          <X className="w-3.5 h-3.5" aria-hidden={true} />
          <span className="hidden sm:inline">Resetta</span>
          <span className="w-4 h-4 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-medium">
            {activeFilterCount}
          </span>
        </button>
      )}

      {/* Segmented view mode control — pushed to the right */}
      <div
        className="segmented-control ml-auto"
        role="group"
        aria-label="Modalita di visualizzazione"
      >
        {VIEW_MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewModeChange(id)}
            className={`segmented-control-item flex items-center gap-1.5 ${viewMode === id ? 'segmented-control-item-active' : ''}`}
            aria-pressed={viewMode === id}
            title={label}
          >
            <Icon className="w-4 h-4" aria-hidden={true} />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
