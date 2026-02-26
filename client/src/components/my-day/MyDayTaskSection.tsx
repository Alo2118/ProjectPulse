/**
 * MyDayTaskSection - Reusable card section for task lists in My Day view
 * Used for both "Focus Oggi" and "Scaduti" sections
 * @module components/my-day/MyDayTaskSection
 */

import type { LucideIcon } from 'lucide-react'
import { MyDayTaskRow } from './MyDayTaskRow'
import type { Task, TaskStatus } from '@/types'

interface MyDayTaskSectionProps {
  title: string
  icon: LucideIcon
  tasks: Task[]
  variant: 'default' | 'danger'
  emptyMessage: string
  emptyIcon: LucideIcon
  canTrackTime: boolean
  runningTimerTaskId: string | null
  onTimerToggle: (taskId: string) => void
  onStatusChange: (task: Task, newStatus: TaskStatus) => void
  onPriorityChange: (task: Task, newPriority: string) => void
}

export function MyDayTaskSection({
  title,
  icon: Icon,
  tasks,
  variant,
  emptyMessage,
  emptyIcon: EmptyIcon,
  canTrackTime,
  runningTimerTaskId,
  onTimerToggle,
  onStatusChange,
  onPriorityChange,
}: MyDayTaskSectionProps) {
  const isDanger = variant === 'danger'

  return (
    <div className={`card ${isDanger ? 'border-l-4 border-l-red-500' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200/30 dark:border-white/5 flex items-center justify-between">
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${
          isDanger
            ? 'text-red-600 dark:text-red-400'
            : 'text-slate-900 dark:text-white'
        }`}>
          <Icon className={`w-5 h-5 ${isDanger ? 'text-red-500' : 'text-cyan-500'}`} />
          {title}
          {tasks.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isDanger
                ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              {tasks.length}
            </span>
          )}
        </h2>
      </div>

      {/* Task rows */}
      {tasks.length === 0 ? (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500">
          <EmptyIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {tasks.map((task) => (
            <MyDayTaskRow
              key={task.id}
              task={task}
              canTrackTime={canTrackTime}
              isTimerRunning={runningTimerTaskId === task.id}
              onTimerToggle={() => onTimerToggle(task.id)}
              onStatusChange={(newStatus) => onStatusChange(task, newStatus)}
              onPriorityChange={(newPriority) => onPriorityChange(task, newPriority)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
