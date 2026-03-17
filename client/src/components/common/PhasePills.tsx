import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type PhaseStatus = "done" | "current" | "upcoming"

export interface PhasePillItem {
  key: string
  label: string
  status: PhaseStatus
}

interface PhasePillsProps {
  phases: PhasePillItem[]
  compact?: boolean
  /** Label for the current phase (shown below pips in compact mode) */
  currentLabel?: string
  className?: string
}

const pillStyles: Record<PhaseStatus, React.CSSProperties> = {
  done: {
    background: "rgba(34,197,94,0.1)",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  current: {
    background: "rgba(45,140,240,0.12)",
    color: "#60a5fa",
    border: "1px solid rgba(45,140,240,0.4)",
    boxShadow: "0 0 0 1px rgba(45,140,240,0.15)",
  },
  upcoming: {
    background: "var(--bg-elevated)",
    color: "var(--text-muted)",
    border: "1px solid var(--border-default)",
  },
}

function getConnectorStyle(left: PhaseStatus, right: PhaseStatus): React.CSSProperties {
  if (left === "done" && right === "done") {
    return { background: "rgba(34,197,94,0.4)" }
  }
  if (left === "done") {
    return { background: "linear-gradient(90deg, rgba(34,197,94,0.4), var(--border-default))" }
  }
  return { background: "var(--border-default)" }
}

export function PhasePills({ phases, compact = false, currentLabel, className }: PhasePillsProps) {
  if (compact) {
    const currentPhase = currentLabel ? { label: currentLabel } : phases.find((p) => p.status === "current")
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-1">
          {phases.map((p) => {
            const bg =
              p.status === "done"
                ? "rgba(34,197,94,0.5)"
                : p.status === "current"
                  ? "rgba(45,140,240,0.8)"
                  : "var(--border-default)"
            return (
              <div
                key={p.key}
                style={{
                  height: "4px",
                  width: "12px",
                  borderRadius: "99px",
                  background: bg,
                  flexShrink: 0,
                }}
              />
            )
          })}
        </div>
        {currentPhase && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{currentPhase.label}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center overflow-x-auto", className)}
      style={{ paddingBottom: "4px", gap: 0 }}
    >
      {phases.map((p, i) => (
        <div key={p.key} className="flex items-center" style={{ flexShrink: 0 }}>
          <div
            className="flex items-center"
            style={{
              gap: "6px",
              padding: "3px 9px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "default",
              ...pillStyles[p.status],
            }}
          >
            {p.status === "done" && <Check style={{ width: "10px", height: "10px" }} />}
            {p.status === "current" && (
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "currentColor",
                  flexShrink: 0,
                }}
              />
            )}
            {p.label}
          </div>
          {i < phases.length - 1 && (
            <div
              style={{
                width: "24px",
                height: "1px",
                flexShrink: 0,
                ...getConnectorStyle(p.status, phases[i + 1].status),
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Legacy export for backward compat with PhasePips usage
export type PhasePip = PhasePillItem
export { PhasePills as PhasePips }
