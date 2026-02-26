/**
 * GanttChart - Main container component for Gantt chart
 */

import { useRef, useMemo, useCallback } from 'react'
import { GanttTask, GanttZoomLevel } from '@/types'
import {
  addDays,
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
} from 'date-fns'
import { it } from 'date-fns/locale'
import GanttBar from './GanttBar'
import GanttTodayLine from './GanttTodayLine'
import GanttDependencyLines from './GanttDependencyLines'

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

  // Calculate bar position and width, clamped to visible view range
  const getBarStyle = useCallback((task: GanttTask) => {
    const taskStart = task.startDate ? new Date(task.startDate) : null
    const taskEnd = task.endDate ? new Date(task.endDate) : null

    if (!taskStart && !taskEnd) {
      return null // No dates, don't show bar
    }

    const effectiveStart = taskStart || taskEnd!
    const effectiveEnd = taskEnd || taskStart!

    const startOffset = differenceInDays(startOfDay(effectiveStart), startOfDay(viewStart))
    const endOffset = differenceInDays(endOfDay(effectiveEnd), startOfDay(viewStart)) + 1

    // Completely outside view
    if (endOffset < 0 || startOffset > totalDays) {
      return null
    }

    // Clamp to visible range
    const clampedStart = Math.max(0, startOffset)
    const clampedEnd = Math.min(totalDays, endOffset)

    const left = clampedStart * dayWidth
    const width = Math.max(dayWidth, (clampedEnd - clampedStart) * dayWidth)

    return { left, width }
  }, [viewStart, totalDays, dayWidth])

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

  // Calculate actual width for each timeline unit based on real days covered
  // This ensures columns always sum to exactly timelineWidth
  const getUnitWidthAt = (index: number) => {
    if (zoomLevel === 'day') return dayWidth

    const unitStart = timelineUnits[index] < viewStart ? viewStart : timelineUnits[index]
    const nextBoundary = index + 1 < timelineUnits.length
      ? timelineUnits[index + 1]
      : addDays(viewEnd, 1)
    const unitEnd = nextBoundary > addDays(viewEnd, 1) ? addDays(viewEnd, 1) : nextBoundary

    return Math.max(0, differenceInDays(unitEnd, unitStart)) * dayWidth
  }

  // Today position
  const today = new Date()
  const todayOffset = differenceInDays(today, viewStart)
  const showTodayLine = todayOffset >= 0 && todayOffset <= totalDays

  const contentHeight = Math.max(200, tasks.length * ROW_HEIGHT)

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-900/70 dark:border-cyan-500/25 dark:bg-slate-900/70 [&]:not(.dark):border-slate-200 [&]:not(.dark):bg-white">
      {/* Task List (left sidebar) */}
      <div
        className="flex flex-shrink-0 flex-col border-r border-cyan-500/15 bg-slate-800/30 dark:border-cyan-500/15 dark:bg-slate-800/30 not-dark:border-slate-200 not-dark:bg-slate-50"
        style={{ width: TASK_LIST_WIDTH }}
      >
        {/* Sidebar Header */}
        <div
          className="flex flex-shrink-0 items-center border-b border-cyan-500/15 bg-slate-800/50 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:border-cyan-500/15 dark:bg-slate-800/50 dark:text-slate-400 not-dark:border-slate-200 not-dark:bg-slate-100 not-dark:text-slate-500"
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
                className={`flex cursor-pointer items-center border-b border-cyan-500/10 transition-colors dark:border-cyan-500/10 not-dark:border-slate-100 ${
                  isEvenRow
                    ? 'bg-slate-800/20 dark:bg-slate-800/20 not-dark:bg-slate-50/50'
                    : ''
                } hover:bg-cyan-500/5 dark:hover:bg-cyan-500/5 not-dark:hover:bg-cyan-50/60`}
                style={{ height: ROW_HEIGHT, paddingLeft: 12 + depth * 16 }}
                onClick={() => onTaskClick?.(task.id)}
              >
                {/* Subtask indicator */}
                {isSubtask && (
                  <div className="mr-2 flex-shrink-0">
                    <div className="h-3 w-3 rounded border-2 border-slate-600 dark:border-slate-600 not-dark:border-slate-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1 pr-2">
                  <div className={`truncate text-sm ${
                    isSubtask ? 'font-normal' : 'font-medium'
                  } ${
                    hasNoDates
                      ? 'text-slate-500 dark:text-slate-500 not-dark:text-slate-400'
                      : 'text-slate-200 dark:text-slate-200 not-dark:text-slate-800'
                  }`}>
                    {task.title}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-500 not-dark:text-slate-400">{task.code}</div>
                </div>
              </div>
            )
          })}

          {tasks.length === 0 && (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-500 not-dark:text-slate-400">
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
          className="flex-shrink-0 overflow-x-auto overflow-y-hidden border-b border-cyan-500/15 bg-slate-800/50 scrollbar-hide dark:border-cyan-500/15 dark:bg-slate-800/50 not-dark:border-slate-200 not-dark:bg-slate-100"
          style={{ height: HEADER_HEIGHT }}
        >
          <div className="flex h-full flex-col" style={{ width: timelineWidth }}>
            {/* Primary header (months/years context) */}
            <div className="flex h-1/2 border-b border-cyan-500/10 dark:border-cyan-500/10 not-dark:border-slate-200">
              {timelineUnits.map((unit, index) => {
                const label = formatHeaderLabel(unit, index)
                return (
                  <div
                    key={index}
                    className={`flex flex-shrink-0 items-center border-r border-cyan-500/10 text-xs font-medium text-slate-400 dark:border-cyan-500/10 dark:text-slate-400 not-dark:border-slate-200 not-dark:text-slate-500 ${
                      zoomLevel === 'day' && label ? 'justify-start pl-1' : 'justify-center'
                    }`}
                    style={{ width: getUnitWidthAt(index) }}
                  >
                    {label}
                  </div>
                )
              })}
            </div>

            {/* Secondary header (day/week/month labels) */}
            <div className="flex h-1/2">
              {timelineUnits.map((unit, index) => {
                const unitIsToday = isToday(unit)
                const weekend = zoomLevel === 'day' && isWeekend(unit)
                return (
                  <div
                    key={index}
                    className={`flex flex-shrink-0 items-center justify-center border-r border-cyan-500/10 text-[10px] dark:border-cyan-500/10 not-dark:border-slate-200 ${
                      unitIsToday
                        ? 'bg-cyan-500/15 font-semibold text-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-400 not-dark:bg-cyan-50 not-dark:text-cyan-600'
                        : weekend
                          ? 'bg-slate-800/40 text-slate-500 dark:bg-slate-800/40 dark:text-slate-500 not-dark:bg-slate-100/60 not-dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-400 not-dark:text-slate-500'
                    }`}
                    style={{ width: getUnitWidthAt(index) }}
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
            {/* Grid background columns */}
            <div className="pointer-events-none absolute inset-0 flex">
              {timelineUnits.map((unit, index) => {
                const unitIsToday = isToday(unit)
                const weekend = zoomLevel === 'day' && isWeekend(unit)
                return (
                  <div
                    key={index}
                    className={`h-full flex-shrink-0 border-r border-cyan-500/10 dark:border-cyan-500/10 not-dark:border-slate-100 ${
                      unitIsToday
                        ? 'bg-cyan-500/8 dark:bg-cyan-500/8 not-dark:bg-cyan-50/40'
                        : weekend
                          ? 'bg-slate-800/30 dark:bg-slate-800/30 not-dark:bg-slate-50/60'
                          : ''
                    }`}
                    style={{ width: getUnitWidthAt(index) }}
                  />
                )
              })}
            </div>

            {/* Today line */}
            {showTodayLine && (
              <GanttTodayLine offset={todayOffset * dayWidth} height={contentHeight} />
            )}

            {/* Task rows with bars */}
            <div className="relative">
              {tasks.map((task, index) => {
                const barStyle = getBarStyle(task)
                const isEvenRow = index % 2 === 0

                return (
                  <div
                    key={task.id}
                    className={`group relative border-b border-cyan-500/10 transition-colors dark:border-cyan-500/10 not-dark:border-slate-100 ${
                      isEvenRow
                        ? 'bg-slate-800/15 dark:bg-slate-800/15 not-dark:bg-slate-50/30'
                        : ''
                    } hover:bg-cyan-500/5 dark:hover:bg-cyan-500/5 not-dark:hover:bg-cyan-50/40`}
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
                        <span className="text-xs italic text-slate-500 dark:text-slate-500 not-dark:text-slate-400">
                          Nessuna data
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Dependency arrow lines overlay */}
              <GanttDependencyLines
                tasks={tasks}
                getBarStyle={getBarStyle}
                contentHeight={contentHeight}
                timelineWidth={timelineWidth}
              />
            </div>

            {/* Empty state spacer */}
            {tasks.length === 0 && <div style={{ height: 200 }} />}
          </div>
        </div>
      </div>
    </div>
  )
}
