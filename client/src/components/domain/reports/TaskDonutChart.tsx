import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { Task } from "@/types"

interface TaskDonutChartProps {
  tasks: Task[]
  isLoading?: boolean
}

const CIRC = 2 * Math.PI * 30

const SEGMENTS = [
  { key: "done",        color: "hsl(var(--success))",          label: "Completati",   textClass: "text-green-400" },
  { key: "in_progress", color: "hsl(var(--primary))",          label: "In corso",     textClass: "text-blue-400" },
  { key: "review",      color: "hsl(var(--warning))",          label: "In revisione", textClass: "text-yellow-400" },
  { key: "todo",        color: "hsl(var(--muted-foreground))", label: "Da iniziare",  textClass: "text-slate-400" },
  { key: "blocked",     color: "hsl(var(--destructive))",      label: "Bloccati",     textClass: "text-red-400" },
] as const

/**
 * SVG donut chart for task status distribution.
 * Segments use semantic color tokens. Center shows total.
 * Matches mockup .donut-wrap pattern.
 */
export function TaskDonutChart({ tasks, isLoading }: TaskDonutChartProps) {
  const counts = useMemo(() => ({
    done:        tasks.filter((t) => t.status === "done").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    review:      tasks.filter((t) => t.status === "review").length,
    todo:        tasks.filter((t) => t.status === "todo").length,
    blocked:     tasks.filter((t) => t.status === "blocked").length,
  }), [tasks])

  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  const arcs = useMemo(() => {
    let offset = 0
    return SEGMENTS.map((seg) => {
      const value = counts[seg.key]
      const dash = total > 0 ? (value / total) * CIRC : 0
      const gap = CIRC - dash
      const arc = { ...seg, value, dash, gap, offset }
      offset += dash
      return arc
    })
  }, [counts, total])

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="w-[90px] h-[90px] rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <svg width="90" height="90" viewBox="0 0 90 90" className="flex-shrink-0">
        <circle
          cx="45" cy="45" r="30"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="45" cy="45" r="30"
            fill="none"
            stroke={arc.color}
            strokeWidth="10"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            transform="rotate(-90 45 45)"
          />
        ))}
        <text
          x="45" y="41"
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="14"
          fontWeight="700"
        >
          {total}
        </text>
        <text
          x="45" y="52"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="7"
        >
          task
        </text>
      </svg>

      <div className="flex flex-col gap-1.5 flex-1">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-[11px]">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: seg.color }}
            />
            <span className="text-muted-foreground flex-1">{seg.label}</span>
            <span className={cn("font-semibold", seg.textClass)}>
              {counts[seg.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
