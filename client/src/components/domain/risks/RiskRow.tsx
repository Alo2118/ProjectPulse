import { AlertTriangle, Search, Pencil } from "lucide-react"
import { DotRating } from "@/components/common/DotRating"
import { RiskScore } from "./RiskScore"
import { RISK_SEVERITY_DOT_COLORS, RISK_SEVERITY_LABELS } from "@/lib/constants"

export interface RiskRowData {
  id: string
  code: string
  title: string
  probability: number
  impact: number
  status: string
  severity: "critical" | "high" | "medium" | "low" | "mitigated"
  project?: { id: string; name: string } | null
  owner?: { id: string; firstName: string; lastName: string } | null
  linkedTasks?: Array<{ id: string; title: string; status: string }> | null
}

interface RiskRowProps {
  risk: RiskRowData
  onClick: (risk: RiskRowData) => void
  onEdit?: (risk: RiskRowData) => void
}

const SEVERITY_STATUS_LABELS: Record<string, string> = {
  open: "Aperto",
  mitigated: "In mitigazione",
  accepted: "Accettato",
  closed: "Chiuso",
}

const STATUS_BADGE_STYLE: Record<string, React.CSSProperties> = {
  open: { background: "rgba(239,68,68,0.08)", color: "#f87171", borderColor: "rgba(239,68,68,0.18)" },
  mitigated: { background: "rgba(99,102,241,0.08)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.2)" },
  accepted: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  closed: { background: "rgba(34,197,94,0.08)", color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
}

const SEV_BADGE_STYLE: Record<string, React.CSSProperties> = {
  critical: { background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" },
  high: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  medium: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  low: { background: "rgba(234,179,8,0.08)", color: "#facc15", borderColor: "rgba(234,179,8,0.2)" },
  mitigated: { background: "rgba(34,197,94,0.08)", color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
}

function SeverityBadge({ severity }: { severity: RiskRowData["severity"] }) {
  const style = SEV_BADGE_STYLE[severity]
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      style={{
        ...style,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        border: "1px solid transparent",
        ...(style?.borderColor ? { borderColor: style.borderColor } : {}),
      }}
    >
      {severity === "critical" && <AlertTriangle style={{ width: 9, height: 9 }} />}
      {RISK_SEVERITY_LABELS[severity] ?? severity}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLE[status] ?? {}
  return (
    <span
      className="inline-flex items-center whitespace-nowrap"
      style={{
        ...style,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 600,
        border: "1px solid transparent",
        ...(style?.borderColor ? { borderColor: style.borderColor } : {}),
      }}
    >
      {SEVERITY_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function OwnerAvatar({ owner }: { owner?: RiskRowData["owner"] }) {
  if (!owner) return <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
  const initials = `${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase()
  const shortName = `${owner.firstName[0]}. ${owner.lastName}`
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className="inline-flex items-center justify-center rounded-full shrink-0 font-bold"
        style={{
          width: 22,
          height: 22,
          fontSize: 9,
          background: "rgba(45,140,240,0.15)",
          color: "#60a5fa",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {initials}
      </span>
      <span className="truncate" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
        {shortName}
      </span>
    </div>
  )
}

/**
 * RiskRow — table row matching the rischi.html mockup.
 * Renders inside a <table> with the expected column structure.
 */
export function RiskRow({ risk, onClick, onEdit }: RiskRowProps) {
  const score = risk.probability * risk.impact
  const dotColor = RISK_SEVERITY_DOT_COLORS[risk.severity] ?? "bg-foreground"
  const linkedCount = risk.linkedTasks?.length ?? 0

  const severityBorderStyle: React.CSSProperties =
    risk.severity === "critical"
      ? { borderLeft: "3px solid rgba(239,68,68,0.5)" }
      : risk.severity === "high" || risk.severity === "medium"
        ? { borderLeft: "3px solid rgba(249,115,22,0.4)" }
        : risk.severity === "low"
          ? { borderLeft: "3px solid rgba(234,179,8,0.35)" }
          : {}

  return (
    <tr
      className="group risk-table-row"
      style={{ cursor: "pointer", transition: "background 0.12s" }}
      onClick={() => onClick(risk)}
      onMouseEnter={(e) => {
        const cells = e.currentTarget.querySelectorAll("td")
        cells.forEach((td) => {
          ;(td as HTMLElement).style.background = "var(--bg-elevated)"
        })
      }}
      onMouseLeave={(e) => {
        const cells = e.currentTarget.querySelectorAll("td")
        cells.forEach((td) => {
          ;(td as HTMLElement).style.background = ""
        })
      }}
    >
      {/* Severity left-border on first cell */}
      <td
        style={{
          ...severityBorderStyle,
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {risk.code}
        </span>
      </td>

      {/* Title + task count */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{risk.title}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          {linkedCount > 0
            ? `${linkedCount} task collegat${linkedCount === 1 ? "o" : "i"}`
            : "Nessun task collegato"}
        </div>
      </td>

      {/* Project */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
          {risk.project?.name ?? "—"}
        </span>
      </td>

      {/* Severity badge */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <SeverityBadge severity={risk.severity} />
      </td>

      {/* Probability dots */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <DotRating value={risk.probability} max={5} color={dotColor} />
      </td>

      {/* Impact dots */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <DotRating value={risk.impact} max={5} color={dotColor} />
      </td>

      {/* Score */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <RiskScore score={score} />
      </td>

      {/* Status badge */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <StatusBadge status={risk.status} />
      </td>

      {/* Owner */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <OwnerAvatar owner={risk.owner} />
      </td>

      {/* Actions — visible on hover */}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          verticalAlign: "middle",
          transition: "background 0.12s",
        }}
      >
        <div
          className="tbl-actions flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            type="button"
            title="Dettaglio"
            onClick={(e) => {
              e.stopPropagation()
              onClick(risk)
            }}
            className="flex items-center justify-center rounded"
            style={{
              width: 26,
              height: 26,
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(45,140,240,0.35)"
              e.currentTarget.style.color = "#60a5fa"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)"
              e.currentTarget.style.color = "var(--text-muted)"
            }}
          >
            <Search style={{ width: 12, height: 12 }} />
          </button>
          {onEdit && (
            <button
              type="button"
              title="Modifica"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(risk)
              }}
              className="flex items-center justify-center rounded"
              style={{
                width: 26,
                height: 26,
                border: "1px solid var(--border-default)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(45,140,240,0.35)"
                e.currentTarget.style.color = "#60a5fa"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)"
                e.currentTarget.style.color = "var(--text-muted)"
              }}
            >
              <Pencil style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
