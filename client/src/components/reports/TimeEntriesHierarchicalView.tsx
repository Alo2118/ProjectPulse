/**
 * TimeEntriesHierarchicalView - Hierarchical view of time entries
 * Shows: Project > Task > Time Entry (with description and user)
 * @module components/reports/TimeEntriesHierarchicalView
 */

import { useState, useMemo } from 'react'
import { Clock, ChevronDown, ChevronRight, FolderKanban, CheckSquare, User } from 'lucide-react'
import type { DetailedTimeEntry } from '@/types'
import { formatDuration as formatDur } from '@utils/dateFormatters'

interface TimeEntriesHierarchicalViewProps {
  entries: DetailedTimeEntry[]
  selectedUserId?: string | null
}

interface ProjectGroup {
  projectId: string
  projectCode: string
  projectName: string
  totalMinutes: number
  tasks: TaskGroup[]
}

interface TaskGroup {
  taskId: string
  taskCode: string
  taskTitle: string
  totalMinutes: number
  entries: DetailedTimeEntry[]
}

export function TimeEntriesHierarchicalView({ entries, selectedUserId }: TimeEntriesHierarchicalViewProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Filter entries by selected user if applicable
  const filteredEntries = useMemo(() => {
    if (!selectedUserId) return entries
    return entries.filter(e => e.userId === selectedUserId)
  }, [entries, selectedUserId])

  // Group entries hierarchically: Project > Task > Entries
  const projectGroups = useMemo(() => {
    const projectMap = new Map<string, ProjectGroup>()

    for (const entry of filteredEntries) {
      if (!entry.projectId) continue

      let project = projectMap.get(entry.projectId)
      if (!project) {
        project = {
          projectId: entry.projectId,
          projectCode: entry.projectCode,
          projectName: entry.projectName,
          totalMinutes: 0,
          tasks: [],
        }
        projectMap.set(entry.projectId, project)
      }

      // Find or create task group
      let taskGroup = project.tasks.find(t => t.taskId === entry.taskId)
      if (!taskGroup) {
        taskGroup = {
          taskId: entry.taskId,
          taskCode: entry.taskCode,
          taskTitle: entry.taskTitle,
          totalMinutes: 0,
          entries: [],
        }
        project.tasks.push(taskGroup)
      }

      // Add entry to task
      taskGroup.entries.push(entry)
      taskGroup.totalMinutes += entry.duration || 0
      project.totalMinutes += entry.duration || 0
    }

    // Sort projects by total time (descending)
    const sorted = Array.from(projectMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes)
    
    // Sort tasks within each project
    sorted.forEach(project => {
      project.tasks.sort((a, b) => b.totalMinutes - a.totalMinutes)
      // Sort entries within each task by start time (most recent first)
      project.tasks.forEach(task => {
        task.entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      })
    })

    return sorted
  }, [filteredEntries])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const formatDuration = formatDur

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nessuna registrazione temporale trovata</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {projectGroups.map((project) => {
        const isProjectExpanded = expandedProjects.has(project.projectId)
        return (
          <div key={project.projectId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Project Header */}
            <button
              onClick={() => toggleProject(project.projectId)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isProjectExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
                <FolderKanban className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {project.projectName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {project.tasks.length} {project.tasks.length === 1 ? 'task' : 'task'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatDuration(project.totalMinutes)}
                </span>
              </div>
            </button>

            {/* Tasks */}
            {isProjectExpanded && (
              <div className="bg-white dark:bg-gray-900">
                {project.tasks.map((task) => {
                  const isTaskExpanded = expandedTasks.has(task.taskId)
                  return (
                    <div key={task.taskId} className="border-t border-gray-200 dark:border-gray-700">
                      {/* Task Header */}
                      <button
                        onClick={() => toggleTask(task.taskId)}
                        className="w-full flex items-center justify-between p-3 pl-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isTaskExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          )}
                          <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <div className="text-left">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {task.taskCode} - {task.taskTitle}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {task.entries.length} {task.entries.length === 1 ? 'registrazione' : 'registrazioni'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-600 dark:text-gray-400">
                            {formatDuration(task.totalMinutes)}
                          </span>
                        </div>
                      </button>

                      {/* Time Entries */}
                      {isTaskExpanded && (
                        <div className="bg-gray-50 dark:bg-gray-800">
                          {task.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="px-3 py-2 pl-20 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {/* Entry Description */}
                                  <div className="text-sm text-gray-700 dark:text-gray-300">
                                    {entry.description || <em className="text-gray-400">Nessuna nota</em>}
                                  </div>
                                  {/* Entry Metadata */}
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      <span>{entry.userName}</span>
                                    </div>
                                    <span>•</span>
                                    <span>{formatDateTime(entry.startTime)}</span>
                                  </div>
                                </div>
                                {/* Duration */}
                                <div className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDuration(entry.duration)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
