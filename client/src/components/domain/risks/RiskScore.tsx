import { cn } from "@/lib/utils"

interface RiskScoreProps {
  score: number
  className?: string
}

/**
 * RiskScore — colored badge showing probability × impact.
 * Score thresholds match the mockup:
 *   ≥ 15 → red (high)
 *   ≥ 6  → orange (medium)
 *   1–5  → yellow (low)
 */
export function RiskScore({ score, className }: RiskScoreProps) {
  const colorStyle: React.CSSProperties =
    score >= 15
      ? { background: "rgba(239,68,68,0.15)", color: "#f87171" }
      : score >= 6
        ? { background: "rgba(249,115,22,0.12)", color: "#fb923c" }
        : { background: "rgba(234,179,8,0.1)", color: "#facc15" }

  return (
    <span
      className={cn("inline-flex items-center justify-center tabular-nums", className)}
      style={{
        ...colorStyle,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 700,
        minWidth: "28px",
        height: "20px",
      }}
    >
      {score}
    </span>
  )
}
