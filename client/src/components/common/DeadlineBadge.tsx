import { cn } from "@/lib/utils"

interface DeadlineBadgeProps {
  date: string | Date
  className?: string
}

function getDaysUntil(date: string | Date): number {
  const target = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function DeadlineBadge({ date, className }: DeadlineBadgeProps) {
  const days = getDaysUntil(date)

  let label: string
  let style: React.CSSProperties

  if (days < 0) {
    const abs = Math.abs(days)
    label = abs === 1 ? "ieri" : `${abs}gg fa`
    style = {
      background: "rgba(239,68,68,0.15)",
      color: "#f87171",
      border: "1px solid rgba(239,68,68,0.3)",
    }
  } else if (days < 3) {
    label = days === 0 ? "oggi" : days === 1 ? "domani" : `${days}gg`
    style = {
      background: "rgba(239,68,68,0.1)",
      color: "#f87171",
      border: "1px solid rgba(239,68,68,0.2)",
    }
  } else if (days <= 14) {
    label = `${days}gg`
    style = {
      background: "rgba(249,115,22,0.08)",
      color: "#fb923c",
      border: "1px solid rgba(249,115,22,0.2)",
    }
  } else {
    label = `${days}gg`
    style = {
      background: "rgba(34,197,94,0.08)",
      color: "#4ade80",
      border: "1px solid rgba(34,197,94,0.2)",
    }
  }

  return (
    <span
      className={cn("inline-block whitespace-nowrap", className)}
      style={{
        fontSize: "10px",
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: "3px",
        ...style,
      }}
    >
      {label}
    </span>
  )
}
