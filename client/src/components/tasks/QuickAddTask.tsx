/**
 * QuickAddTask - Inline row for quickly creating a task with title + optional quick fields
 * @module components/tasks/QuickAddTask
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTaskStore } from '@stores/taskStore'
import type { Task, TaskStatus } from '@/types'

interface QuickAddTaskProps {
  defaultStatus?: TaskStatus
  defaultProjectId?: string
  defaultParentTaskId?: string
  onCreated?: (task: Task) => void
  placeholder?: string
}

export function QuickAddTask({
  defaultStatus = 'todo',
  defaultProjectId,
  defaultParentTaskId,
  onCreated,
  placeholder = 'Aggiungi task...',
}: QuickAddTaskProps) {
  const [isActive, setIsActive] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [priority, setPriority] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { createTask } = useTaskStore()

  // Focus input when activated
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive])

  const handleActivate = useCallback(() => {
    setIsActive(true)
  }, [])

  const handleCancel = useCallback(() => {
    setIsActive(false)
    setTitle('')
    setExpanded(false)
    setPriority('')
    setDueDate('')
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const taskType = (defaultParentTaskId ? 'subtask' : 'task') as 'subtask' | 'task'
      const taskData: Partial<Task> = {
        title: trimmed,
        status: defaultStatus,
        ...(defaultProjectId ? { projectId: defaultProjectId } : {}),
        ...(defaultParentTaskId ? { parentTaskId: defaultParentTaskId } : {}),
        taskType,
        ...(priority ? { priority: priority as Task['priority'] } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      }
      const task = await createTask(taskData)
      setTitle('')
      setPriority('')
      setDueDate('')
      onCreated?.(task)
      // Keep input open for successive adds; re-focus
      inputRef.current?.focus()
    } catch {
      // Store already shows error toast; preserve the text so user can retry
    } finally {
      setIsSubmitting(false)
    }
  }, [title, isSubmitting, defaultStatus, defaultProjectId, defaultParentTaskId, priority, dueDate, createTask, onCreated])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSubmit()
      } else if (e.key === 'Escape') {
        handleCancel()
      }
    },
    [handleSubmit, handleCancel]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Only deactivate if not submitting and input is empty
      if (!isSubmitting && !e.currentTarget.value.trim()) {
        handleCancel()
      }
    },
    [isSubmitting, handleCancel]
  )

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={handleActivate}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500
                   cursor-pointer hover:text-gray-600 dark:hover:text-gray-300
                   hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all w-full text-left"
        aria-label="Aggiungi task"
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        <span>{placeholder}</span>
      </button>
    )
  }

  return (
    <div className="px-3 py-1.5">
      {/* Title row */}
      <div className="flex items-center gap-2">
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSubmitting}
          placeholder={placeholder}
          aria-label="Titolo del nuovo task"
          className="flex-1 bg-transparent border-none outline-none text-sm
                     text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                     disabled:opacity-50"
        />

        {/* Expand / collapse quick fields toggle */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 transition-colors flex-shrink-0"
          title={expanded ? 'Nascondi campi' : 'Più opzioni'}
          aria-label={expanded ? 'Nascondi campi aggiuntivi' : 'Mostra campi aggiuntivi'}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick fields row — visible only in expanded mode */}
      {expanded && (
        <div className="flex items-center gap-2 mt-2 ml-8">
          {/* Priority selector */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 transition-colors"
            aria-label="Priorità"
          >
            <option value="">Priorità</option>
            <option value="low">Bassa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Critica</option>
          </select>

          {/* Due date picker */}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 transition-colors"
            aria-label="Data di scadenza"
          />
        </div>
      )}
    </div>
  )
}
