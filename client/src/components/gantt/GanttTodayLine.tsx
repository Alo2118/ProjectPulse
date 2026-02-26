/**
 * GanttTodayLine - Vertical cyan line indicator for today's date
 * JARVIS palette: cyan-500 for the "now" marker (active/key-data element)
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
      {/* Vertical line */}
      <div className="h-full w-0.5 bg-cyan-500 opacity-70 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />

      {/* Top triangle marker pointing down */}
      <div
        className="absolute -left-1.5 top-0 h-0 w-0
                   border-l-[6px] border-l-transparent
                   border-r-[6px] border-r-transparent
                   border-t-[8px] border-t-cyan-500"
      />

      {/* "Oggi" label */}
      <div className="absolute left-1 top-1 whitespace-nowrap rounded bg-cyan-500/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]">
        Oggi
      </div>
    </div>
  )
}
