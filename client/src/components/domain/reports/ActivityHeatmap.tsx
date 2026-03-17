import { Skeleton } from "@/components/ui/skeleton"

interface ActivityHeatmapProps {
  /** 28 values — 4 weeks × 7 days (Mon→Sun), ordered Mon-first */
  data: number[]
  isLoading?: boolean
}

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]

/**
 * Activity heatmap grid (4 weeks × 7 days).
 * Cell colors use --primary opacity scale (0 → full).
 * Weekend cells shown at 40% opacity.
 * Matches mockup .heatmap-grid pattern.
 */
export function ActivityHeatmap({ data, isLoading }: ActivityHeatmapProps) {
  const heatData = data.length === 28 ? data : new Array<number>(28).fill(0)
  const maxVal = Math.max(...heatData, 1)

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <Skeleton key={d} className="h-2 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <span
            key={d}
            className="text-[9px] text-muted-foreground text-center font-medium"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Cell grid — 7 cols × 4 rows */}
      <div className="grid grid-cols-7 gap-1">
        {heatData.map((v, i) => {
          const dayOfWeek = i % 7
          const isWeekend = dayOfWeek >= 5
          const intensity = maxVal > 0 ? v / maxVal : 0
          return (
            <div
              key={i}
              title={`${v.toFixed(1)}h`}
              className="aspect-square rounded cursor-default transition-opacity hover:opacity-70"
              style={{
                borderRadius: "2px",
                width: "12px",
                height: "12px",
                background:
                  isWeekend || v === 0
                    ? "hsl(var(--muted))"
                    : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                opacity: isWeekend ? 0.4 : 1,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-muted-foreground">Meno</span>
        <div className="w-3 h-3 rounded-sm bg-muted" style={{ borderRadius: "2px" }} />
        <div className="w-3 h-3 rounded-sm" style={{ borderRadius: "2px", background: "hsl(var(--primary) / 0.2)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ borderRadius: "2px", background: "hsl(var(--primary) / 0.4)" }} />
        <div className="w-3 h-3 rounded-sm" style={{ borderRadius: "2px", background: "hsl(var(--primary) / 0.65)" }} />
        <div className="w-3 h-3 rounded-sm bg-primary" style={{ borderRadius: "2px" }} />
        <span className="text-[10px] text-muted-foreground">Più</span>
      </div>
    </div>
  )
}
