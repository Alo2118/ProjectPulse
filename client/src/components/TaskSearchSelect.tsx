import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react'
import api from '@services/api'
import { useAuthStore } from '@stores/authStore'
import type { Task } from '@/types'

interface TaskSearchSelectProps {
  value: string
  onChange: (taskId: string) => void
  disabled?: boolean
  placeholder?: string
  statusFilter?: string
  projectId?: string
  /** Task ID to exclude from selection (e.g., current task being edited) */
  excludeTaskId?: string
}

interface TaskWithDepth extends Task {
  depth: number
}

interface GroupedTasks {
  label: string
  projectCode: string | null
  tasks: TaskWithDepth[]
}

export default function TaskSearchSelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'Cerca task per nome, codice o progetto...',
  statusFilter,
  projectId,
  excludeTaskId,
}: TaskSearchSelectProps) {
  const { user } = useAuthStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true)
      try {
        const isPrivileged = user?.role === 'admin' || user?.role === 'direzione'
        const base = isPrivileged ? '/tasks' : '/tasks/my'
        const params = new URLSearchParams({ limit: '500', includeSubtasks: 'true' })
        if (statusFilter) params.append('status', statusFilter)
        if (projectId) params.append('projectId', projectId)
        const response = await api.get<{ success: boolean; data: Task[] }>(
          `${base}?${params.toString()}`
        )
        if (response.data.success) {
          setTasks(response.data.data)
        }
      } catch {
        // silently ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchTasks()
  }, [user?.role, statusFilter, projectId])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedTask = useMemo(() => tasks.find((t) => t.id === value), [tasks, value])

  // Filter tasks and exclude the current task being edited (to prevent circular reference)
  const filteredTasks = useMemo(() => {
    let result = tasks

    // Exclude current task and all its descendants (can't be parent of itself or its children)
    if (excludeTaskId) {
      const excludeIds = new Set<string>([excludeTaskId])
      // Find all descendants of excluded task
      const findDescendants = (parentId: string) => {
        for (const t of tasks) {
          if (t.parentTaskId === parentId && !excludeIds.has(t.id)) {
            excludeIds.add(t.id)
            findDescendants(t.id)
          }
        }
      }
      findDescendants(excludeTaskId)
      result = result.filter((t) => !excludeIds.has(t.id))
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.code?.toLowerCase().includes(q) ||
          t.project?.name?.toLowerCase().includes(q) ||
          t.project?.code?.toLowerCase().includes(q)
      )
    }

    return result
  }, [tasks, search, excludeTaskId])

  // Build hierarchical tree with depth for each task
  const buildTree = useCallback((taskList: Task[]): TaskWithDepth[] => {
    const taskMap = new Map(taskList.map((t) => [t.id, t]))
    const result: TaskWithDepth[] = []
    const added = new Set<string>()

    // Calculate depth for a task
    const getDepth = (task: Task, visited = new Set<string>()): number => {
      if (!task.parentTaskId || visited.has(task.id)) return 0
      visited.add(task.id)
      const parent = taskMap.get(task.parentTaskId)
      if (!parent) return 0
      return 1 + getDepth(parent, visited)
    }

    // Add task and its subtasks recursively
    const addWithSubtasks = (task: Task, depth: number) => {
      if (added.has(task.id)) return
      added.add(task.id)
      result.push({ ...task, depth })
      // Find and add children
      const children = taskList.filter((t) => t.parentTaskId === task.id)
      children.forEach((child) => addWithSubtasks(child, depth + 1))
    }

    // Start with root tasks (no parent or parent not in list)
    const rootTasks = taskList.filter(
      (t) => !t.parentTaskId || !taskMap.has(t.parentTaskId)
    )
    rootTasks.forEach((t) => addWithSubtasks(t, t.parentTaskId ? getDepth(t) : 0))

    // Add any orphaned tasks
    taskList.filter((t) => !added.has(t.id)).forEach((t) => {
      result.push({ ...t, depth: getDepth(t) })
    })

    return result
  }, [])

  const grouped: GroupedTasks[] = useMemo(() => {
    const projectMap = new Map<string, Task[]>()
    const noProject: Task[] = []

    for (const task of filteredTasks) {
      if (task.project) {
        const key = task.project.id
        if (!projectMap.has(key)) {
          projectMap.set(key, [])
        }
        projectMap.get(key)!.push(task)
      } else {
        noProject.push(task)
      }
    }

    const groups: GroupedTasks[] = []

    // Build hierarchical tree for each project group
    for (const [, projectTasks] of projectMap) {
      const firstTask = projectTasks[0]
      groups.push({
        label: firstTask.project!.name,
        projectCode: firstTask.project!.code,
        tasks: buildTree(projectTasks),
      })
    }

    groups.sort((a, b) => a.label.localeCompare(b.label))

    if (noProject.length > 0) {
      groups.push({
        label: 'Senza progetto',
        projectCode: null,
        tasks: buildTree(noProject)
      })
    }

    return groups
  }, [filteredTasks, buildTree])

  const handleSelect = useCallback(
    (taskId: string) => {
      onChange(taskId)
      setSearch('')
      setIsOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange('')
    setSearch('')
    inputRef.current?.focus()
  }, [onChange])

  return (
    <div ref={containerRef} className="relative">
      {/* Input field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        {value && selectedTask && !isOpen ? (
          <button
            type="button"
            onClick={() => {
              if (disabled) return
              setIsOpen(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            disabled={disabled}
            className="input w-full pl-9 pr-8 text-left truncate disabled:opacity-50"
          >
            <span className="text-xs text-slate-500 mr-1.5">{selectedTask.project?.name || '—'}</span>
            {selectedTask.title}
          </button>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="input w-full pl-9 pr-8"
          />
        )}
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
          {isLoading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Caricamento...
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">
              {search ? 'Nessun task trovato' : 'Nessun task disponibile'}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                  {group.label}
                </div>
                {group.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleSelect(task.id)}
                    className={`w-full text-left py-2 text-sm hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors flex items-center ${
                      task.id === value
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                    style={{ paddingLeft: `${12 + task.depth * 16}px` }}
                  >
                    {task.depth > 0 && (
                      <ChevronRight className="w-3 h-3 text-slate-400 mr-1 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-400 mr-1.5 flex-shrink-0">{task.code}</span>
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
