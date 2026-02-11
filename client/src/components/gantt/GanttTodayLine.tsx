/**
 * GanttTodayLine - Vertical line indicator for today's date
 */

interface GanttTodayLineProps {
  offset: number
  height: number
}

export default function GanttTodayLine({ offset, height }: GanttTodayLineProps) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: offset, height: Math.max(height, 200) }}
    >
      {/* Line */}
      <div className="h-full w-0.5 bg-red-500 opacity-80" />

      {/* Top marker - triangle pointing down */}
      <div
        className="absolute -left-1.5 top-0 h-0 w-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid rgb(239 68 68)',
        }}
      />

      {/* Label - positioned inside visible area */}
      <div className="absolute left-1 top-1 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
        Oggi
      </div>
    </div>
  )
}
