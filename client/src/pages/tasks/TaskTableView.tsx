/**
 * TaskTableView - Excel-like spreadsheet table for tasks with inline editing.
 * Supports client-side sorting by any column and bulk selection.
 * @module pages/tasks/TaskTableView
 */

import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Flag,
  CheckSquare,
  CornerDownRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Table2,
} from 'lucide-react'
import { useTaskStore } from '@stores/taskStore'
import { InlineSelect } from '@components/ui/InlineSelect'
import type { InlineSelectOption } from '@components/ui/InlineSelect'
import { InlineDatePicker } from '@components/ui/InlineDatePicker'
import { InlineUserSelect } from '@components/ui/InlineUserSelect'
import { InlineTextInput } from '@components/ui/InlineTextInput'
import { DepartmentBadge } from '@/components/ui/DepartmentBadge'
import type { Task, TaskStatus } from '@/types'

// ─── Option constants ────────────────────────────────────────────────────────

const STATUS_OPTIONS: InlineSelectOption[] = [
  { value: 'todo',        label: 'Da fare',    color: 'text-slate-400',  bgColor: 'bg-slate-100 dark:bg-slate-800' },
  { value: 'in_progress', label: 'In Corso',   color: 'text-blue-500',   bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'review',      label: 'Review',     color: 'text-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
  { value: 'blocked',     label: 'Bloccato',   color: 'text-red-500',    bgColor: 'bg-red-100 dark:bg-red-900/30' },
  { value: 'done',        label: 'Completato', color: 'text-green-500',  bgColor: 'bg-green-100 dark:bg-green-900/30' },
  { value: 'cancelled',   label: 'Annullato',  color: 'text-slate-500',  bgColor: 'bg-slate-100 dark:bg-slate-800' },
]

const PRIORITY_OPTIONS: InlineSelectOption[] = [
  { value: 'low',      label: 'Bassa',   dotColor: 'bg-green-500' },
  { value: 'medium',   label: 'Media',   dotColor: 'bg-amber-500' },
  { value: 'high',     label: 'Alta',    dotColor: 'bg-orange-500' },
  { value: 'critical', label: 'Critica', dotColor: 'bg-red-500' },
]

// ─── Sortable column definition ───────────────────────────────────────────────

type SortableColumn =
  | 'code'
  | 'title'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'project'
  | 'department'
  | 'dueDate'
  | 'estimatedHours'
  | 'actualHours'

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskTableViewProps {
  tasks: Task[]
  selectedTasks: Set<string>
  onToggleSelect: (taskId: string) => void
  onSelectAll: () => void
  onRefresh: () => void
}

// ─── Task type icon ───────────────────────────────────────────────────────────

function TaskTypeIcon({ taskType }: { taskType: Task['taskType'] }) {
  if (taskType === 'milestone') {
    return <Flag size={13} className="text-amber-500 flex-shrink-0" aria-label="Milestone" />
  }
  if (taskType === 'task') {
    return <CheckSquare size={13} className="text-blue-500 flex-shrink-0" aria-label="Task" />
  }
  return <CornerDownRight size={13} className="text-slate-400 flex-shrink-0" aria-label="Subtask" />
}

// ─── Sort indicator (multi-column aware) ──────────────────────────────────────

function SortIndicator({
  sortColumns,
  column,
}: {
  sortColumns: Array<{ column: string; direction: 'asc' | 'desc' }>
  column: string
}) {
  const sortInfo = sortColumns.find((s) => s.column === column)
  const sortIndex = sortColumns.findIndex((s) => s.column === column)

  if (!sortInfo) {
    return (
      <ArrowUpDown
        className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0"
        aria-hidden
      />
    )
  }

  return (
    <span className="flex items-center gap-0.5 ml-0.5 flex-shrink-0">
      {sortInfo.direction === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-cyan-500" aria-hidden />
      ) : (
        <ArrowDown className="w-3 h-3 text-cyan-500" aria-hidden />
      )}
      {sortColumns.length > 1 && (
        <span className="text-[10px] font-bold text-cyan-500 leading-none">
          {sortIndex + 1}
        </span>
      )}
    </span>
  )
}

// ─── Column label map ─────────────────────────────────────────────────────────

function getColumnLabel(column: string): string {
  const labels: Record<string, string> = {
    code:           'Codice',
    title:          'Titolo',
    status:         'Stato',
    priority:       'Priorità',
    assignee:       'Assegnato',
    project:        'Progetto',
    department:     'Reparto',
    dueDate:        'Scadenza',
    estimatedHours: 'Ore Stimate',
    actualHours:    'Ore Effettive',
  }
  return labels[column] ?? column
}

// ─── Priority sort weight ─────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const STATUS_WEIGHT: Record<string, number> = {
  blocked: 6,
  in_progress: 5,
  review: 4,
  todo: 3,
  done: 2,
  cancelled: 1,
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TaskTableView({
  tasks,
  selectedTasks,
  onToggleSelect,
  onSelectAll,
  onRefresh,
}: TaskTableViewProps) {
  const { updateTask, changeTaskStatus } = useTaskStore()

  const [sortColumns, setSortColumns] = useState<Array<{ column: string; direction: 'asc' | 'desc' }>>([])

  // ── Sorting ────────────────────────────────────────────────────────────────

  const handleSort = useCallback((column: string, event: React.MouseEvent) => {
    setSortColumns((prev) => {
      // Shift+click: add/toggle secondary sort
      if (event.shiftKey) {
        const existing = prev.findIndex((s) => s.column === column)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = {
            column,
            direction: updated[existing].direction === 'asc' ? 'desc' : 'asc',
          }
          return updated
        }
        // Max 3 sort levels
        if (prev.length >= 3) return prev
        return [...prev, { column, direction: 'asc' }]
      }
      // Normal click: replace sort with single column
      const existing = prev.find((s) => s.column === column)
      if (existing) {
        return [{ column, direction: existing.direction === 'asc' ? 'desc' : 'asc' }]
      }
      return [{ column, direction: 'asc' }]
    })
  }, [])

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks]
    if (sortColumns.length === 0) return sorted

    sorted.sort((a, b) => {
      for (const { column, direction } of sortColumns) {
        let cmp = 0

        switch (column as SortableColumn) {
          case 'code':
            cmp = a.code.localeCompare(b.code)
            break
          case 'title':
            cmp = a.title.localeCompare(b.title)
            break
          case 'status':
            cmp = (STATUS_WEIGHT[a.status] ?? 0) - (STATUS_WEIGHT[b.status] ?? 0)
            break
          case 'priority':
            cmp = (PRIORITY_WEIGHT[a.priority] ?? 0) - (PRIORITY_WEIGHT[b.priority] ?? 0)
            break
          case 'assignee': {
            const nameA = a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : ''
            const nameB = b.assignee ? `${b.assignee.firstName} ${b.assignee.lastName}` : ''
            cmp = nameA.localeCompare(nameB)
            break
          }
          case 'project':
            cmp = (a.project?.name ?? '').localeCompare(b.project?.name ?? '')
            break
          case 'department':
            cmp = (a.department?.name ?? '').localeCompare(b.department?.name ?? '')
            break
          case 'dueDate':
            cmp = (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
            break
          case 'estimatedHours':
            cmp = (a.estimatedHours ?? 0) - (b.estimatedHours ?? 0)
            break
          case 'actualHours':
            cmp = (a.actualHours ?? 0) - (b.actualHours ?? 0)
            break
          default:
            cmp = 0
        }

        if (cmp !== 0) {
          return direction === 'desc' ? -cmp : cmp
        }
      }
      return 0
    })

    return sorted
  }, [tasks, sortColumns])

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedTasks.has(t.id))

  // ── Conditional row styling ────────────────────────────────────────────────
  // Priority: selected > conditional (overdue/today) > zebra stripe
  // Critical/high priority border is always applied unless done/cancelled.

  const getRowClassName = useCallback((task: Task, index: number, isSelected: boolean) => {
    const classes = [
      'border-b border-slate-100 dark:border-slate-700',
      'transition-colors duration-100',
    ]

    // Selected state takes priority over everything else
    if (isSelected) {
      classes.push('bg-cyan-50 dark:bg-cyan-900/20')
      classes.push('hover:bg-cyan-50/80 dark:hover:bg-cyan-900/30')
      // Still apply priority border for selected rows
      if (task.priority === 'critical') {
        classes.push('border-l-2 border-l-red-500')
      } else if (task.priority === 'high') {
        classes.push('border-l-2 border-l-orange-400')
      }
      return classes.join(' ')
    }

    if (task.status === 'done' || task.status === 'cancelled') {
      classes.push('opacity-50')
      // Zebra still applies for done/cancelled rows
      if (index % 2 === 0) {
        classes.push('bg-slate-50/30 dark:bg-white/[0.02]')
      }
    } else {
      // Conditional date-based coloring overrides zebra
      let hasConditionalBg = false

      if (task.dueDate) {
        const today = new Date().toISOString().split('T')[0]
        const dueDay = task.dueDate.split('T')[0]
        if (dueDay < today) {
          classes.push('bg-red-50/50 dark:bg-red-900/10')
          classes.push('hover:bg-red-50/70 dark:hover:bg-red-900/15')
          hasConditionalBg = true
        } else if (dueDay === today) {
          classes.push('bg-amber-50/50 dark:bg-amber-900/10')
          classes.push('hover:bg-amber-50/70 dark:hover:bg-amber-900/15')
          hasConditionalBg = true
        }
      }

      // Zebra striping only when no conditional color applied
      if (!hasConditionalBg) {
        if (index % 2 === 0) {
          classes.push('bg-slate-50/30 dark:bg-white/[0.02]')
        }
        classes.push('hover:bg-cyan-50/30 dark:hover:bg-cyan-900/10')
      }

      // Priority border always applied
      if (task.priority === 'critical') {
        classes.push('border-l-2 border-l-red-500')
      } else if (task.priority === 'high') {
        classes.push('border-l-2 border-l-orange-400')
      }
    }

    return classes.join(' ')
  }, [])

  // ── Header cell helper ─────────────────────────────────────────────────────

  function HeaderCell({
    column,
    label,
    className: cls = '',
  }: {
    column: SortableColumn
    label: string
    className?: string
  }) {
    const isActive = sortColumns.some((s) => s.column === column)
    return (
      <th
        scope="col"
        onClick={(e) => handleSort(column, e)}
        className={[
          'px-3 py-2 text-left text-xs font-medium uppercase tracking-wider',
          'cursor-pointer select-none transition-colors group',
          'hover:bg-slate-100 dark:hover:bg-slate-700/60',
          isActive
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-slate-500 dark:text-slate-400',
          cls,
        ].join(' ')}
        title="Click per ordinare · Shift+Click per ordinamento secondario"
      >
        <span className="inline-flex items-center gap-0.5">
          {label}
          <SortIndicator sortColumns={sortColumns} column={column} />
        </span>
      </th>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Table2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" aria-hidden />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Nessun task da mostrare</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Modifica i filtri o crea un nuovo task
        </p>
      </div>
    )
  }

  // ── Table ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Conditional formatting legend — pill style */}
      <div className="flex items-center gap-3 flex-wrap mb-3 text-xs">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          In ritardo
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
          Scade oggi
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <span className="w-1 h-4 rounded-sm bg-red-500 flex-shrink-0" />
          Critico
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          <span className="w-1 h-4 rounded-sm bg-orange-400 flex-shrink-0" />
          Alta priorità
        </span>
      </div>

      {/* Sort hint bar — polished card style */}
      {sortColumns.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 mb-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">
            Ordinamento:{' '}
            {sortColumns.map((s, i) => (
              <span key={s.column}>
                {i > 0 && <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {i + 1}. {getColumnLabel(s.column)}
                </span>
                <span className="ml-0.5 text-slate-400 dark:text-slate-500">
                  {s.direction === 'asc' ? ' ↑' : ' ↓'}
                </span>
              </span>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setSortColumns([])}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded px-1.5 py-0.5 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Rimuovi ordinamento"
            aria-label="Rimuovi ordinamento"
          >
            <X className="w-3 h-3" />
            <span>Azzera</span>
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          {/* ── HEAD — sticky with blur backdrop ── */}
          <thead
            className={[
              'sticky top-0 z-10',
              'bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm',
              'border-b border-slate-200 dark:border-slate-700',
              'shadow-[0_1px_3px_rgba(0,0,0,0.08)]',
            ].join(' ')}
          >
            <tr className="bg-slate-50/95 dark:bg-slate-800/95">
              {/* Checkbox */}
              <th
                scope="col"
                className="px-3 py-2 w-8"
                aria-label="Seleziona tutti"
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  aria-label="Seleziona tutti i task"
                />
              </th>

              <HeaderCell column="code"           label="Codice"        className="w-24" />
              <HeaderCell column="title"          label="Titolo"        className="min-w-[200px]" />
              <HeaderCell column="status"         label="Stato"         className="w-32" />
              <HeaderCell column="priority"       label="Priorità"      className="w-24" />
              <HeaderCell column="assignee"       label="Assegnatario"  className="w-32" />
              <HeaderCell column="project"        label="Progetto"      className="w-40" />
              <HeaderCell column="department"     label="Reparto"       className="w-32" />
              <HeaderCell column="dueDate"        label="Scadenza"      className="w-32" />
              <HeaderCell column="estimatedHours" label="Ore Stim."     className="w-20 text-right" />
              <HeaderCell column="actualHours"    label="Ore Reali"     className="w-20 text-right" />
            </tr>
          </thead>

          {/* ── BODY ── */}
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTasks.map((task, index) => {
              const isSelected = selectedTasks.has(task.id)

              return (
                <tr
                  key={task.id}
                  className={getRowClassName(task, index, isSelected)}
                >
                  {/* ── Checkbox ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      aria-label={`Seleziona ${task.title}`}
                    />
                  </td>

                  {/* ── Code ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-24">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
                      title={`Apri ${task.code}`}
                    >
                      {task.code}
                    </Link>
                  </td>

                  {/* ── Title ── */}
                  <td className="px-3 py-1.5 min-w-[200px] max-w-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <TaskTypeIcon taskType={task.taskType} />
                      <InlineTextInput
                        value={task.title}
                        onChange={async (newTitle) => {
                          if (newTitle.trim() !== '') {
                            await updateTask(task.id, { title: newTitle })
                            onRefresh()
                          }
                        }}
                        placeholder="Titolo..."
                        className="flex-1 min-w-0"
                      />
                    </div>
                  </td>

                  {/* ── Status ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-32">
                    <InlineSelect
                      value={task.status}
                      options={STATUS_OPTIONS}
                      onChange={async (newStatus) => {
                        await changeTaskStatus(task.id, newStatus as TaskStatus)
                      }}
                      size="md"
                    />
                  </td>

                  {/* ── Priority ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-24">
                    <InlineSelect
                      value={task.priority}
                      options={PRIORITY_OPTIONS}
                      onChange={async (newPriority) => {
                        await updateTask(task.id, { priority: newPriority as Task['priority'] })
                      }}
                      size="md"
                    />
                  </td>

                  {/* ── Assignee ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-32">
                    <InlineUserSelect
                      value={task.assigneeId}
                      displayUser={task.assignee ?? null}
                      onChange={async (userId) => {
                        await updateTask(task.id, { assigneeId: userId })
                      }}
                      size="sm"
                      allowClear
                    />
                  </td>

                  {/* ── Project ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-40">
                    {task.project ? (
                      <span
                        className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-[140px]"
                        title={task.project.name}
                      >
                        {task.project.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">
                        Standalone
                      </span>
                    )}
                  </td>

                  {/* ── Department ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-32">
                    <DepartmentBadge department={task.department} size="sm" />
                  </td>

                  {/* ── Due Date ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-32">
                    <InlineDatePicker
                      value={task.dueDate}
                      onChange={async (newDate) => {
                        await updateTask(task.id, { dueDate: newDate })
                      }}
                      showClear
                    />
                  </td>

                  {/* ── Estimated Hours ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-20 text-right">
                    {(() => {
                      const h = task.estimatedHours ?? 0
                      return (
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {h !== 0 ? `${h}h` : '-'}
                        </span>
                      )
                    })()}
                  </td>

                  {/* ── Actual Hours (read-only) ── */}
                  <td className="px-3 py-1.5 whitespace-nowrap w-20 text-right">
                    {(() => {
                      const h = task.actualHours ?? 0
                      return (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {h !== 0 ? `${h}h` : '-'}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
