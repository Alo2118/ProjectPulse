/**
 * GanttDependencyLines - SVG overlay for drawing dependency arrows between task bars
 *
 * Renders finish-to-start arrows as solid lines and other dependency types as dashed lines.
 * The component is absolutely positioned over the task bar area and is pointer-events-none
 * so it does not interfere with bar clicks.
 */

import { useMemo } from 'react'
import { GanttTask } from '@/types'

// ─── Constants (must match GanttChart.tsx) ───────────────────────────────────
const ROW_HEIGHT = 40
/** Pixels to step horizontally before turning vertical */
const H_STEP = 12
/** Half-size of the arrowhead triangle */
const ARROW_HALF = 5

interface BarPosition {
  /** Left edge pixel position (absolute within the timeline content) */
  left: number
  /** Pixel width of the bar */
  width: number
  /** Row index (0-based, top of row is rowIndex * ROW_HEIGHT) */
  rowIndex: number
}

interface GanttDependencyLinesProps {
  tasks: GanttTask[]
  /** Returns the bar's { left, width } for a task, or null if the task has no visible bar */
  getBarStyle: (task: GanttTask) => { left: number; width: number } | null
  /** Total pixel height of the content area */
  contentHeight: number
  /** Total pixel width of the timeline area */
  timelineWidth: number
}

// ─── Path builders ────────────────────────────────────────────────────────────

/**
 * Finish-to-start: exits the right edge of the predecessor bar, steps right by H_STEP,
 * turns vertically to the successor row, then enters the left edge of the successor bar.
 * If both bars are on the same row or the successor bar starts before the predecessor ends,
 * the line takes a detour above both rows to avoid overlapping with the bars.
 */
function buildFinishToStartPath(
  predRight: number,
  predY: number,
  succLeft: number,
  succY: number,
): string {
  const midX = predRight + H_STEP

  // Same row or successor starts to the left — detour above
  if (Math.abs(predY - succY) < 2 || succLeft < predRight + 2) {
    const detourY = Math.min(predY, succY) - ROW_HEIGHT * 0.45
    return [
      `M ${predRight} ${predY}`,
      `L ${midX} ${predY}`,
      `L ${midX} ${detourY}`,
      `L ${succLeft - ARROW_HALF} ${detourY}`,
      `L ${succLeft - ARROW_HALF} ${succY}`,
    ].join(' ')
  }

  return [
    `M ${predRight} ${predY}`,
    `L ${midX} ${predY}`,
    `L ${midX} ${succY}`,
    `L ${succLeft} ${succY}`,
  ].join(' ')
}

/**
 * Start-to-start: exits the left edge of the predecessor bar, steps left by H_STEP,
 * turns vertically to the successor row, then enters the left edge of the successor bar.
 */
function buildStartToStartPath(
  predLeft: number,
  predY: number,
  succLeft: number,
  succY: number,
): string {
  const sharedX = Math.min(predLeft, succLeft) - H_STEP
  return [
    `M ${predLeft} ${predY}`,
    `L ${sharedX} ${predY}`,
    `L ${sharedX} ${succY}`,
    `L ${succLeft} ${succY}`,
  ].join(' ')
}

/**
 * Finish-to-finish: exits the right edge of the predecessor bar, steps right by H_STEP,
 * turns vertically to the successor row, then enters the right edge of the successor bar.
 */
function buildFinishToFinishPath(
  predRight: number,
  predY: number,
  succRight: number,
  succY: number,
): string {
  const sharedX = Math.max(predRight, succRight) + H_STEP
  return [
    `M ${predRight} ${predY}`,
    `L ${sharedX} ${predY}`,
    `L ${sharedX} ${succY}`,
    `L ${succRight} ${succY}`,
  ].join(' ')
}

/**
 * Start-to-finish: exits the left edge of the predecessor bar and connects to the
 * right edge of the successor bar.
 */
function buildStartToFinishPath(
  predLeft: number,
  predY: number,
  succRight: number,
  succY: number,
): string {
  const midX = predLeft - H_STEP
  return [
    `M ${predLeft} ${predY}`,
    `L ${midX} ${predY}`,
    `L ${midX} ${succY}`,
    `L ${succRight} ${succY}`,
  ].join(' ')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GanttDependencyLines({
  tasks,
  getBarStyle,
  contentHeight,
  timelineWidth,
}: GanttDependencyLinesProps) {
  // Build a map from task ID to its bar position (null means no visible bar)
  const positionMap = useMemo<Map<string, BarPosition>>(() => {
    const map = new Map<string, BarPosition>()
    tasks.forEach((task, rowIndex) => {
      const style = getBarStyle(task)
      if (style) {
        map.set(task.id, { left: style.left, width: style.width, rowIndex })
      }
    })
    return map
  }, [tasks, getBarStyle])

  // Collect all dependency path segments to render
  const segments = useMemo(() => {
    const result: Array<{
      key: string
      path: string
      isDashed: boolean
      /** Whether the arrowhead points left (into the bar's left side) */
      arrowPointsLeft: boolean
      arrowTipX: number
      arrowTipY: number
    }> = []

    // Iterate every task's dependency list (each dep is stored on the successor task)
    tasks.forEach((task) => {
      task.dependencies.forEach((dep) => {
        const predPos = positionMap.get(dep.predecessorId)
        const succPos = positionMap.get(dep.successorId)

        // Skip if either task has no visible bar
        if (!predPos || !succPos) return

        const type = dep.dependencyType

        // Y centre of each row
        const predY = predPos.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2
        const succY = succPos.rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2

        let path = ''
        let arrowPointsLeft = true
        let arrowTipX = 0
        let arrowTipY = 0

        switch (type) {
          case 'finish_to_start': {
            path = buildFinishToStartPath(
              predPos.left + predPos.width,
              predY,
              succPos.left,
              succY,
            )
            arrowPointsLeft = true
            arrowTipX = succPos.left
            arrowTipY = succY
            break
          }
          case 'start_to_start': {
            path = buildStartToStartPath(predPos.left, predY, succPos.left, succY)
            arrowPointsLeft = false
            arrowTipX = succPos.left
            arrowTipY = succY
            break
          }
          case 'finish_to_finish': {
            path = buildFinishToFinishPath(
              predPos.left + predPos.width,
              predY,
              succPos.left + succPos.width,
              succY,
            )
            arrowPointsLeft = false
            arrowTipX = succPos.left + succPos.width
            arrowTipY = succY
            break
          }
          case 'start_to_finish': {
            path = buildStartToFinishPath(predPos.left, predY, succPos.left + succPos.width, succY)
            arrowPointsLeft = false
            arrowTipX = succPos.left + succPos.width
            arrowTipY = succY
            break
          }
          default: {
            // Treat unknown types as finish-to-start
            path = buildFinishToStartPath(
              predPos.left + predPos.width,
              predY,
              succPos.left,
              succY,
            )
            arrowPointsLeft = true
            arrowTipX = succPos.left
            arrowTipY = succY
          }
        }

        result.push({
          key: `${dep.predecessorId}-${dep.successorId}`,
          path,
          isDashed: type !== 'finish_to_start',
          arrowPointsLeft,
          arrowTipX,
          arrowTipY,
        })
      })
    })

    return result
  }, [tasks, positionMap])

  if (segments.length === 0) return null

  const svgHeight = Math.max(contentHeight, 200)

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
      width={timelineWidth}
      height={svgHeight}
      aria-hidden="true"
    >
      {segments.map((seg) => {
        // Build an arrowhead polygon at the tip of the line.
        // Points left: triangle pointing toward negative-x (→ enters from right, pointing left).
        // Points right: triangle pointing toward positive-x.
        const { arrowTipX: tx, arrowTipY: ty } = seg
        const arrowPoints = seg.arrowPointsLeft
          ? `${tx},${ty} ${tx + ARROW_HALF * 1.6},${ty - ARROW_HALF} ${tx + ARROW_HALF * 1.6},${ty + ARROW_HALF}`
          : `${tx},${ty} ${tx - ARROW_HALF * 1.6},${ty - ARROW_HALF} ${tx - ARROW_HALF * 1.6},${ty + ARROW_HALF}`

        return (
          <g key={seg.key}>
            <path
              d={seg.path}
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-400 dark:stroke-gray-500"
              strokeDasharray={seg.isDashed ? '5 3' : undefined}
            />
            <polygon
              points={arrowPoints}
              className="fill-gray-400 dark:fill-gray-500"
            />
          </g>
        )
      })}
    </svg>
  )
}
