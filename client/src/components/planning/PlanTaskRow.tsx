/**
 * PlanTaskRow - A single row in the planning wizard tree editor.
 * Displays an editable task with inline controls for title, hours,
 * priority, assignee, plus actions to add a child or remove the row.
 * @module components/planning/PlanTaskRow
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Flag, CheckSquare, CircleDot, Plus, X, ChevronDown } from 'lucide-react'
import type { PlanTask } from '@stores/planningStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string
  firstName: string
  lastName: string
}

export interface PlanTaskRowProps {
  task: PlanTask
  depth: number
  users: User[]
  onUpdate: (tempId: string, updates: Partial<PlanTask>) => void
  onRemove: (tempId: string) => void
  onAddChild: (parentTempId: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Bassa',    dot: 'bg-gray-400 dark:bg-gray-500' },
  { value: 'medium',   label: 'Media',    dot: 'bg-amber-400 dark:bg-amber-500' },
  { value: 'high',     label: 'Alta',     dot: 'bg-orange-500 dark:bg-orange-400' },
  { value: 'critical', label: 'Critica',  dot: 'bg-red-500 dark:bg-red-400' },
] as const

type PriorityValue = typeof PRIORITY_OPTIONS[number]['value']

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Compact priority picker rendered as a dot + label dropdown. */
function PriorityDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = PRIORITY_OPTIONS.find((p) => p.value === value) ?? PRIORITY_OPTIONS[1]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Priorità: ${current.label}`}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${current.dot}`} />
        <span className="text-xs text-gray-600 dark:text-gray-400 hidden md:inline">
          {current.label}
        </span>
        <ChevronDown size={10} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Seleziona priorità"
          className="absolute top-full left-0 mt-0.5 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[110px]"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={[
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
                'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                opt.value === value ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : '',
              ].join(' ')}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
              <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Compact assignee selector rendered as a name/avatar dropdown. */
function AssigneeDropdown({
  value,
  users,
  onChange,
}: {
  value: string | undefined
  users: User[]
  onChange: (v: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const assigned = users.find((u) => u.id === value)
  const initials = assigned
    ? `${assigned.firstName[0]}${assigned.lastName[0]}`.toUpperCase()
    : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={assigned ? `Assegnato a: ${assigned.firstName} ${assigned.lastName}` : 'Nessun assegnatario'}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {assigned ? (
          <>
            <span className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              {initials}
            </span>
            <span className="text-xs text-gray-700 dark:text-gray-300 hidden md:inline max-w-[80px] truncate">
              {assigned.firstName}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
        )}
        <ChevronDown size={10} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Seleziona assegnatario"
          className="absolute top-full left-0 mt-0.5 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px] max-h-48 overflow-y-auto"
        >
          {/* Unassign option */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(undefined); setOpen(false) }}
            className={[
              'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
              'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              !value ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : '',
            ].join(' ')}
          >
            <span className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex-shrink-0" />
            <span className="text-gray-500 dark:text-gray-400 italic">Nessuno</span>
          </button>

          {users.map((user) => {
            const userInitials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={user.id === value}
                onClick={() => { onChange(user.id); setOpen(false) }}
                className={[
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
                  'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                  user.id === value ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : '',
                ].join(' ')}
              >
                <span className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {userInitials}
                </span>
                <span className="text-gray-700 dark:text-gray-300 truncate">
                  {user.firstName} {user.lastName}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type icon helper
// ---------------------------------------------------------------------------

function TaskTypeIcon({ taskType, depth }: { taskType: string; depth: number }) {
  if (taskType === 'milestone' || depth === 0) {
    return <Flag size={13} className="text-purple-500 dark:text-purple-400 flex-shrink-0" aria-label="Milestone" />
  }
  if (taskType === 'subtask' || depth === 2) {
    return <CircleDot size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" aria-label="Subtask" />
  }
  return <CheckSquare size={13} className="text-blue-500 dark:text-blue-400 flex-shrink-0" aria-label="Task" />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanTaskRow({ task, depth, users, onUpdate, onRemove, onAddChild }: PlanTaskRowProps) {
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync when task changes from outside
  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(task.title)
    }
  }, [task.title, isEditingTitle])

  useEffect(() => {
    if (isEditingTitle) {
      titleRef.current?.focus()
      titleRef.current?.select()
    }
  }, [isEditingTitle])

  const commitTitle = useCallback(() => {
    const trimmed = titleDraft.trim()
    setIsEditingTitle(false)
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.tempId, { title: trimmed })
    } else {
      // Revert draft if empty or unchanged
      setTitleDraft(task.title)
    }
  }, [titleDraft, task.title, task.tempId, onUpdate])

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
    if (e.key === 'Escape') { setTitleDraft(task.title); setIsEditingTitle(false) }
  }

  const handleHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate(task.tempId, { estimatedHours: parsed })
    }
  }, [task.tempId, onUpdate])

  const handlePriorityChange = useCallback((v: string) => {
    onUpdate(task.tempId, { priority: v as PriorityValue })
  }, [task.tempId, onUpdate])

  const handleAssigneeChange = useCallback((v: string | undefined) => {
    onUpdate(task.tempId, { assigneeId: v })
  }, [task.tempId, onUpdate])

  const canHaveChildren = task.taskType === 'milestone' || task.taskType === 'task'

  // Depth-based left padding: 0→0px, 1→24px, 2→48px
  const paddingLeft = depth * 24

  return (
    <div
      className="flex items-center gap-1 sm:gap-2 py-1 group border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors min-h-[40px]"
      style={{ paddingLeft: `${paddingLeft}px` }}
      role="row"
    >
      {/* Depth connector line for nested items */}
      {depth > 0 && (
        <div
          className="flex-shrink-0 w-px bg-gray-200 dark:bg-gray-700 self-stretch"
          aria-hidden="true"
        />
      )}

      {/* Type icon */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center">
        <TaskTypeIcon taskType={task.taskType} depth={depth} />
      </div>

      {/* Title — editable */}
      <div className="flex-1 min-w-0 pr-1">
        {isEditingTitle ? (
          <input
            ref={titleRef}
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            placeholder="Titolo task..."
            className="w-full text-sm px-1.5 py-0.5 border border-blue-300 dark:border-blue-600 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            title="Clicca per modificare"
            className="w-full text-left text-sm text-gray-800 dark:text-gray-200 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-0.5 px-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {task.title || <span className="italic text-gray-400 dark:text-gray-500">Senza titolo</span>}
          </button>
        )}
      </div>

      {/* Estimated hours */}
      <div className="flex-shrink-0 w-16">
        <input
          type="number"
          value={task.estimatedHours === 0 ? '' : task.estimatedHours}
          onChange={handleHoursChange}
          min={0}
          step={0.5}
          placeholder="0h"
          aria-label="Ore stimate"
          className="w-full text-xs text-right px-1.5 py-0.5 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-300 dark:focus:border-blue-600 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-transparent focus:bg-white dark:focus:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
        />
      </div>

      {/* Priority */}
      <div className="flex-shrink-0">
        <PriorityDropdown value={task.priority} onChange={handlePriorityChange} />
      </div>

      {/* Assignee */}
      <div className="flex-shrink-0">
        <AssigneeDropdown value={task.assigneeId} users={users} onChange={handleAssigneeChange} />
      </div>

      {/* Actions — always visible for accessibility, visually subtle until hover */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {canHaveChildren && (
          <button
            type="button"
            onClick={() => onAddChild(task.tempId)}
            aria-label="Aggiungi sotto-elemento"
            title="Aggiungi figlio"
            className="p-1 rounded text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(task.tempId)}
          aria-label="Rimuovi task"
          title="Rimuovi"
          className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <X size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
