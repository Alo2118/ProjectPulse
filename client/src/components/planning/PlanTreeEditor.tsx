/**
 * PlanTreeEditor - Interactive hierarchical task tree editor for the planning wizard.
 * Renders a spreadsheet-like table with milestones, tasks, and subtasks.
 * Each row is a PlanTaskRow. New milestones and root tasks can be added at the bottom.
 * @module components/planning/PlanTreeEditor
 */

import { useMemo, useCallback } from 'react'
import { Flag, CheckSquare, ListTree } from 'lucide-react'
import type { PlanTask } from '@stores/planningStore'
import { PlanTaskRow } from './PlanTaskRow'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string
  firstName: string
  lastName: string
}

export interface PlanTreeEditorProps {
  tasks: PlanTask[]
  users: User[]
  onUpdate: (tempId: string, updates: Partial<PlanTask>) => void
  onRemove: (tempId: string) => void
  onAddTask: (parentTempId?: string) => void
}

// ---------------------------------------------------------------------------
// Tree-building utilities
// ---------------------------------------------------------------------------

/**
 * Converts a flat list of PlanTask items into a nested tree list
 * ordered as: milestones first, then their child tasks, then subtasks under each task.
 * Returns a flat ordered list of { task, depth } pairs suitable for rendering.
 */
function buildFlatTree(tasks: PlanTask[]): Array<{ task: PlanTask; depth: number }> {
  // Separate by type for ordering
  const milestones = tasks.filter((t) => t.taskType === 'milestone' && !t.parentTempId)
  const rootTasks = tasks.filter((t) => t.taskType === 'task' && !t.parentTempId)
  const childTasks = tasks.filter((t) => t.taskType === 'task' && t.parentTempId)
  const subtasks = tasks.filter((t) => t.taskType === 'subtask')

  const result: Array<{ task: PlanTask; depth: number }> = []

  // Milestones (depth 0) → their child tasks (depth 1) → subtasks (depth 2)
  for (const milestone of milestones) {
    result.push({ task: milestone, depth: 0 })

    const children = childTasks.filter((t) => t.parentTempId === milestone.tempId)
    for (const child of children) {
      result.push({ task: child, depth: 1 })

      const grandchildren = subtasks.filter((t) => t.parentTempId === child.tempId)
      for (const grandchild of grandchildren) {
        result.push({ task: grandchild, depth: 2 })
      }
    }
  }

  // Root-level tasks (no parent, not under a milestone) at depth 0
  for (const task of rootTasks) {
    result.push({ task, depth: 0 })

    const children = subtasks.filter((t) => t.parentTempId === task.tempId)
    for (const child of children) {
      result.push({ task: child, depth: 1 })
    }
  }

  // Orphan subtasks (parent was removed or not found)
  const handledTempIds = new Set(result.map((r) => r.task.tempId))
  for (const task of tasks) {
    if (!handledTempIds.has(task.tempId)) {
      result.push({ task, depth: 0 })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanTreeEditor({ tasks, users, onUpdate, onRemove, onAddTask }: PlanTreeEditorProps) {
  const flatTree = useMemo(() => buildFlatTree(tasks), [tasks])

  const handleAddChild = useCallback(
    (parentTempId: string) => {
      onAddTask(parentTempId)
    },
    [onAddTask]
  )

  const isEmpty = tasks.length === 0

  return (
    <div className="flex flex-col">
      {/* Column header row */}
      <div className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-white/[0.03] rounded-t-lg">
        {/* Icon placeholder */}
        <div className="flex-shrink-0 w-4" aria-hidden="true" />
        {/* Title column */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Task
          </span>
        </div>
        {/* Ore */}
        <div className="flex-shrink-0 w-16 text-right">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Ore
          </span>
        </div>
        {/* Priorità */}
        <div className="flex-shrink-0 w-20">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Priorita
          </span>
        </div>
        {/* Assegnatario */}
        <div className="flex-shrink-0 w-24">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:inline">
            Assegnatario
          </span>
        </div>
        {/* Actions column */}
        <div className="flex-shrink-0 w-14">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Azioni
          </span>
        </div>
      </div>

      {/* Task rows */}
      <div
        className="bg-white dark:bg-surface-800/60 border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg overflow-hidden"
        role="table"
        aria-label="Albero dei task del piano"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <ListTree className="w-6 h-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Nessun task nel piano
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Aggiungi una milestone o un task per iniziare
              </p>
            </div>
          </div>
        ) : (
          <div role="rowgroup">
            {flatTree.map(({ task, depth }) => (
              <div key={task.tempId} role="row" className="px-2">
                <PlanTaskRow
                  task={task}
                  depth={depth}
                  users={users}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAddChild={handleAddChild}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom action buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button
          type="button"
          onClick={() => onAddTask(undefined)}
          aria-label="Aggiungi milestone al piano"
          className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <Flag size={12} aria-hidden="true" />
          Aggiungi Milestone
        </button>

        <button
          type="button"
          onClick={() => {
            // Trigger adding a root-level task (no parent)
            onAddTask(undefined)
          }}
          aria-label="Aggiungi task al piano"
          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <CheckSquare size={12} aria-hidden="true" />
          Aggiungi Task
        </button>

        {tasks.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
            {tasks.length} {tasks.length === 1 ? 'elemento' : 'elementi'}
          </span>
        )}
      </div>
    </div>
  )
}
