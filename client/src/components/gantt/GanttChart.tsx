/**
 * GanttChart - Main container component for Gantt chart
 */

import { useRef, useMemo, useCallback } from 'react'
import { GanttTask, GanttZoomLevel } from '@/types'
import {
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isToday,
  isWeekend,
  startOfDay,
  endOfDay,
  endOfWeek,
  endOfMonth,
} from 'date-fns'
import { it } from 'date-fns/locale'
import GanttBar from './GanttBar'
import GanttTodayLine from './GanttTodayLine'

interface GanttChartProps {
  tasks: GanttTask[]
  zoomLevel: GanttZoomLevel
  viewStart: Date
  viewEnd: Date
  onTaskClick?: (taskId: string) => void
}

// Constants
const ROW_HEIGHT = 40
const HEADER_HEIGHT = 60
const TASK_LIST_WIDTH = 280
const DAY_WIDTH = { day: 40, week: 24, month: 12 }

export default function GanttChart({
  tasks,
  zoomLevel,
  viewStart,
  viewEnd,
  onTaskClick,
}: GanttChartProps) {
  const sidebarBodyRef = useRef<HTMLDivElement>(null)
  const timelineHeaderRef = useRef<HTMLDivElement>(null)
  const timelineBodyRef = useRef<HTMLDivElement>(null)

  // Sync vertical scroll between sidebar and timeline body
  const handleSidebarScroll = useCallback(() => {
    if (sidebarBodyRef.current && timelineBodyRef.current) {
      timelineBodyRef.current.scrollTop = sidebarBodyRef.current.scrollTop
    }
  }, [])

  // Sync both vertical (sidebar) and horizontal (header) scroll
  const handleTimelineScroll = useCallback(() => {
    if (timelineBodyRef.current) {
      // Sync vertical scroll with sidebar
      if (sidebarBodyRef.current) {
        sidebarBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop
      }
      // Sync horizontal scroll with header
      if (timelineHeaderRef.current) {
        timelineHeaderRef.current.scrollLeft = timelineBodyRef.current.scrollLeft
      }
    }
  }, [])

  // Calculate timeline units based on zoom level
  const timelineUnits = useMemo(() => {
    switch (zoomLevel) {
      case 'day':
        return eachDayOfInterval({ start: viewStart, end: viewEnd })
      case 'week':
        return eachWeekOfInterval({ start: viewStart, end: viewEnd }, { locale: it })
      case 'month':
        return eachMonthOfInterval({ start: viewStart, end: viewEnd })
    }
  }, [zoomLevel, viewStart, viewEnd])

  const totalDays = differenceInDays(viewEnd, viewStart) + 1
  const dayWidth = DAY_WIDTH[zoomLevel]
  const timelineWidth = totalDays * dayWidth

  // Calculate bar position and width
  const getBarStyle = (task: GanttTask) => {
    const taskStart = task.startDate ? new Date(task.startDate) : null
    const taskEnd = task.endDate ? new Date(task.endDate) : null

    if (!taskStart && !taskEnd) {
      return null // No dates, don't show bar
    }

    const effectiveStart = taskStart || taskEnd!
    const effectiveEnd = taskEnd || taskStart!

    const startOffset = differenceInDays(startOfDay(effectiveStart), startOfDay(viewStart))
    const duration = differenceInDays(endOfDay(effectiveEnd), startOfDay(effectiveStart)) + 1

    // Only show if within view
    if (startOffset + duration < 0 || startOffset > totalDays) {
      return null
    }

    const left = Math.max(0, startOffset * dayWidth)
    const width = Math.max(40, duration * dayWidth)

    return { left, width }
  }

  // Format header label (top row - provides context: month for day/week, year for month)
  const formatHeaderLabel = (date: Date, index: number) => {
    switch (zoomLevel) {
      case 'day':
        // Show month name only at month boundaries or first visible day
        if (index === 0 || date.getDate() === 1) {
          return format(date, 'MMM yy', { locale: it })
        }
        return ''
      case 'week':
        return format(date, 'MMM yyyy', { locale: it })
      case 'month':
        return format(date, 'yyyy', { locale: it })
    }
  }

  // Get sub-header label (bottom row - specific unit: day number, date range, month name)
  const formatSubHeader = (date: Date) => {
    switch (zoomLevel) {
      case 'day':
        return format(date, 'd', { locale: it })
      case 'week': {
        const weekEnd = endOfWeek(date, { locale: it })
        return `${format(date, 'd', { locale: it })}-${format(weekEnd, 'd MMM', { locale: it })}`
      }
      case 'month':
        return format(date, 'MMM', { locale: it })
    }
  }

  // Get header width based on zoom
  const getUnitWidth = () => {
    switch (zoomLevel) {
      case 'day':
        return dayWidth
      case 'week':
        return dayWidth * 7
      case 'month':
        return dayWidth * 30
    }
  }

  // Today position
  const today = new Date()
  const todayOffset = differenceInDays(today, viewStart)
  const showTodayLine = todayOffset >= 0 && todayOffset <= totalDays

  const contentHeight = Math.max(200, tasks.length * ROW_HEIGHT)

  return (
    <div className="flex h-full rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-surface-900">
      {/* Task List (left sidebar) */}
      <div
        className="flex flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-surface-850"
        style={{ width: TASK_LIST_WIDTH }}
      >
        {/* Sidebar Header */}
        <div
          className="flex flex-shrink-0 items-center border-b border-gray-200 bg-gray-100 px-3 font-medium text-gray-700 dark:border-white/10 dark:bg-surface-800 dark:text-gray-300"
          style={{ height: HEADER_HEIGHT }}
        >
          Task
        </div>

        {/* Sidebar Body - synced scroll */}
        <div
          ref={sidebarBodyRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          onScroll={handleSidebarScroll}
        >
          {tasks.map((task, index) => {
            const isEvenRow = index % 2 === 0
            const hasNoDates = !task.startDate && !task.endDate
            const depth = task.depth || 0
            const isSubtask = depth > 0

            return (
              <div
                key={task.id}
                className={`flex cursor-pointer items-center border-b border-gray-200/50 transition-colors dark:border-surface-800 ${
                  isEvenRow ? 'bg-gray-50/50 dark:bg-surface-800/20' : ''
                } hover:bg-blue-50/50 dark:hover:bg-blue-500/5`}
                style={{ height: ROW_HEIGHT, paddingLeft: 12 + depth * 16 }}
                onClick={() => onTaskClick?.(task.id)}
              >
                {/* Subtask indicator */}
                {isSubtask && (
                  <div className="mr-2 flex-shrink-0">
                    <div className="h-3 w-3 rounded border-2 border-gray-300 dark:border-gray-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1 pr-2">
                  <div className={`truncate text-sm ${
                    isSubtask ? 'font-normal' : 'font-medium'
                  } ${
                    hasNoDates
                      ? 'text-gray-500 dark:text-gray-500'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {task.title}
                  </div>
                  <div className="truncate text-xs text-gray-500">{task.code}</div>
                </div>
              </div>
            )
          })}

          {tasks.length === 0 && (
            <div className="flex h-32 items-center justify-center text-gray-500">
              Nessun task con date pianificate
            </div>
          )}
        </div>
      </div>

      {/* Timeline (right side) */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Timeline Header - synced horizontal scroll */}
        <div
          ref={timelineHeaderRef}
          className="flex-shrink-0 overflow-x-auto overflow-y-hidden border-b border-gray-200 bg-gray-100 scrollbar-hide dark:border-white/10 dark:bg-surface-800"
          style={{ height: HEADER_HEIGHT }}
        >
          <div className="flex h-full flex-col" style={{ width: timelineWidth }}>
            {/* Primary header (weeks/months) */}
            <div className="flex h-1/2 border-b border-gray-200 dark:border-white/10">
              {timelineUnits.map((unit, index) => {
                const label = formatHeaderLabel(unit, index)
                return (
                  <div
                    key={index}
                    className={`flex flex-shrink-0 items-center border-r border-gray-200 text-xs font-medium text-gray-600 dark:border-white/10 dark:text-gray-400 ${
                      zoomLevel === 'day' && label ? 'justify-start pl-1' : 'justify-center'
                    }`}
                    style={{ width: getUnitWidth() }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>

            {/* Secondary header (sub-labels) */}
            <div className="flex h-1/2">
              {timelineUnits.map((unit, index) => {
                const today = isToday(unit)
                const weekend = zoomLevel === 'day' && isWeekend(unit)
                return (
                  <div
                    key={index}
                    className={`flex flex-shrink-0 items-center justify-center border-r border-gray-200 text-[10px] dark:border-white/10 ${
                      today
                        ? 'bg-blue-500/20 font-medium text-blue-600 dark:text-blue-400'
                        : weekend
                          ? 'bg-gray-200/50 text-gray-400 dark:bg-surface-800/50 dark:text-gray-500'
                          : 'text-gray-500'
                    }`}
                    style={{ width: zoomLevel === 'day' ? dayWidth : getUnitWidth() }}
                    title={zoomLevel === 'day' ? format(unit, 'EEEE d MMMM yyyy', { locale: it }) : undefined}
                  >
                    {zoomLevel === 'day' ? (
                      <span className="flex flex-col items-center leading-tight">
                        <span>{formatSubHeader(unit)}</span>
                        <span className="text-[8px] opacity-60">{format(unit, 'EEE', { locale: it }).substring(0, 2)}</span>
                      </span>
                    ) : (
                      formatSubHeader(unit)
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Timeline Body - scrollable */}
        <div
          ref={timelineBodyRef}
          className="flex-1 overflow-auto"
          onScroll={handleTimelineScroll}
        >
          <div className="relative" style={{ width: timelineWidth, minHeight: contentHeight }}>
            {/* Grid background - absolute positioned */}
            <div className="pointer-events-none absolute inset-0 flex">
              {timelineUnits.map((unit, index) => {
                const today = isToday(unit)
                const weekend = zoomLevel === 'day' && isWeekend(unit)
                return (
                  <div
                    key={index}
                    className={`h-full flex-shrink-0 border-r border-gray-100 dark:border-surface-800 ${
                      today
                        ? 'bg-blue-500/10 dark:bg-blue-500/5'
                        : weekend
                          ? 'bg-gray-100/60 dark:bg-surface-800/40'
                          : ''
                    }`}
                    style={{ width: zoomLevel === 'day' ? dayWidth : getUnitWidth() }}
                  />
                )
              })}
            </div>

            {/* Today line */}
            {showTodayLine && (
              <GanttTodayLine offset={todayOffset * dayWidth} height={contentHeight} />
            )}

            {/* Task rows with bars - using normal flow for proper alignment */}
            <div className="relative">
              {tasks.map((task, index) => {
                const barStyle = getBarStyle(task)
                const isEvenRow = index % 2 === 0

                return (
                  <div
                    key={task.id}
                    className={`group relative border-b border-gray-200/50 transition-colors dark:border-surface-800 ${
                      isEvenRow ? 'bg-gray-50/30 dark:bg-surface-800/20' : ''
                    } hover:bg-blue-50/50 dark:hover:bg-blue-500/5`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {barStyle ? (
                      <GanttBar
                        task={task}
                        left={barStyle.left}
                        width={barStyle.width}
                        height={ROW_HEIGHT - 8}
                        onClick={() => onTaskClick?.(task.id)}
                      />
                    ) : (
                      // Placeholder for tasks without dates
                      <div className="flex h-full items-center px-2">
                        <span className="text-xs italic text-gray-400 dark:text-gray-600">
                          Nessuna data
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Empty state spacer */}
            {tasks.length === 0 && <div style={{ height: 200 }} />}
          </div>
        </div>
      </div>
    </div>
  )
}
