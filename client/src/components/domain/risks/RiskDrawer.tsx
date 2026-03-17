import { CheckSquare, AlertTriangle } from "lucide-react"
import { useMemo } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { DotRating } from "@/components/common/DotRating"
import { RiskScore } from "./RiskScore"
import { RISK_SCALE_LABELS, RISK_SEVERITY_DOT_COLORS, RISK_SEVERITY_LABELS } from "@/lib/constants"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RiskDrawerData {
  id: string
  code: string
  title: string
  description?: string | null
  probability: number
  impact: number
  status: string
  severity: "critical" | "high" | "medium" | "low" | "mitigated"
  mitigation?: string | null
  project?: { id: string; name: string } | null
  owner?: { id: string; firstName: string; lastName: string } | null
  linkedTasks?: Array<{ id: string; title: string; status: string }> | null
  createdAt: string
  updatedAt?: string | null
}

interface RiskDrawerProps {
  risk: RiskDrawerData | null
  open: boolean
  onClose: () => void
}

// ── Status / severity badge styles ────────────────────────────────────────────

const SEVERITY_BADGE_STYLE: Record<string, React.CSSProperties> = {
  critical: { background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" },
  high: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  medium: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  low: { background: "rgba(234,179,8,0.08)", color: "#facc15", borderColor: "rgba(234,179,8,0.2)" },
  mitigated: { background: "rgba(34,197,94,0.08)", color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
}

const STATUS_BADGE_STYLE: Record<string, React.CSSProperties> = {
  open: { background: "rgba(239,68,68,0.08)", color: "#f87171", borderColor: "rgba(239,68,68,0.18)" },
  mitigated: { background: "rgba(99,102,241,0.08)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.2)" },
  accepted: { background: "rgba(249,115,22,0.08)", color: "#fb923c", borderColor: "rgba(249,115,22,0.2)" },
  closed: { background: "rgba(34,197,94,0.08)", color: "#4ade80", borderColor: "rgba(34,197,94,0.2)" },
}

const STATUS_DISPLAY: Record<string, string> = {
  open: "Aperto",
  mitigated: "In mitigazione",
  accepted: "Accettato",
  closed: "Chiuso",
}

const STATUS_DOT_COLOR: Record<string, string> = {
  open: "border-orange-400",
  mitigated: "border-indigo-400",
  accepted: "border-amber-400",
  closed: "border-green-400",
  critical: "border-red-400",
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InlineBadge({
  style,
  children,
}: {
  style: React.CSSProperties
  children: React.ReactNode
}) {
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
        ...(style.borderColor ? { borderColor: style.borderColor } : {}),
      }}
    >
      {children}
    </span>
  )
}

function DrawerSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function OwnerCell({ owner }: { owner?: RiskDrawerData["owner"] }) {
  if (!owner) return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
  const initials = `${owner.firstName[0] ?? ""}${owner.lastName[0] ?? ""}`.toUpperCase()
  const fullName = `${owner.firstName[0]}. ${owner.lastName}`
  return (
    <div className="flex items-center gap-1.5">
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
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{fullName}</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RiskDrawer({ risk, open, onClose }: RiskDrawerProps) {
  const historyItems = useMemo(() => {
    if (!risk) return []
    const entries: { date: string; text: string; type: string }[] = []
    if (risk.createdAt) {
      entries.push({
        date: new Date(risk.createdAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Rischio identificato e registrato",
        type: "open",
      })
    }
    if (risk.status === "mitigated" && risk.updatedAt && risk.updatedAt !== risk.createdAt) {
      entries.push({
        date: new Date(risk.updatedAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Piano di mitigazione attivato",
        type: "mitigated",
      })
    }
    if (risk.status === "closed" && risk.updatedAt) {
      entries.push({
        date: new Date(risk.updatedAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        text: "Rischio chiuso — soluzione implementata",
        type: "closed",
      })
    }
    return entries.reverse()
  }, [risk])

  if (!risk) return null

  const score = risk.probability * risk.impact
  const dotColor = RISK_SEVERITY_DOT_COLORS[risk.severity] ?? "bg-foreground"
  const linkedTasks = risk.linkedTasks ?? []
  const sevStyle = SEVERITY_BADGE_STYLE[risk.severity] ?? {}
  const staStyle = STATUS_BADGE_STYLE[risk.status] ?? {}

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col overflow-hidden"
        style={{ width: 420, maxWidth: 420 }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border-default)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <InlineBadge style={sevStyle}>
              {risk.severity === "critical" && (
                <AlertTriangle style={{ width: 9, height: 9 }} />
              )}
              {RISK_SEVERITY_LABELS[risk.severity] ?? risk.severity}
            </InlineBadge>
            <InlineBadge style={staStyle}>
              {STATUS_DISPLAY[risk.status] ?? risk.status}
            </InlineBadge>
          </div>
          <SheetTitle
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.3,
              color: "var(--text-primary)",
            }}
          >
            {risk.title}
          </SheetTitle>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {risk.code}
            {risk.project ? ` · ${risk.project.name}` : ""}
          </p>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "18px 20px" }}
        >
          {/* Parametri */}
          <DrawerSection title="Parametri rischio">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Probabilità
                </label>
                <DotRating value={risk.probability} max={5} color={dotColor} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {RISK_SCALE_LABELS[risk.probability] ?? String(risk.probability)}
                </p>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Impatto
                </label>
                <DotRating value={risk.impact} max={5} color={dotColor} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  {RISK_SCALE_LABELS[risk.impact] ?? String(risk.impact)}
                </p>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Score (P×I)
                </label>
                <RiskScore score={score} />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Responsabile
                </label>
                <OwnerCell owner={risk.owner} />
              </div>
            </div>
          </DrawerSection>

          {/* Descrizione */}
          {risk.description && (
            <DrawerSection title="Descrizione">
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  background: "var(--bg-elevated)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {risk.description}
              </div>
            </DrawerSection>
          )}

          {/* Mitigazione */}
          {risk.mitigation && (
            <DrawerSection title="Piano di mitigazione">
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  background: "rgba(99,102,241,0.04)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: "1px solid rgba(99,102,241,0.12)",
                }}
              >
                {risk.mitigation}
              </div>
            </DrawerSection>
          )}

          {/* Task collegati */}
          <DrawerSection title="Task collegati">
            {linkedTasks.length === 0 ? (
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                Nessun task collegato
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {linkedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2"
                    style={{
                      padding: "7px 10px",
                      borderRadius: 5,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <CheckSquare style={{ width: 11, height: 11, color: "#22d3ee", flexShrink: 0 }} />
                    <span
                      className="flex-1 truncate min-w-0"
                      style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      {task.title}
                    </span>
                    <InlineBadge style={STATUS_BADGE_STYLE[task.status] ?? {}}>
                      {STATUS_DISPLAY[task.status] ?? task.status}
                    </InlineBadge>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>

          {/* Storico */}
          <DrawerSection title="Storico modifiche">
            {historyItems.length === 0 ? (
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                Nessuno storico disponibile
              </p>
            ) : (
              <div className="flex flex-col">
                {historyItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-2.5"
                    style={{
                      padding: "8px 0",
                      borderBottom: i < historyItems.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div
                      className={`mt-[3px] h-2 w-2 shrink-0 rounded-full border-2 ${STATUS_DOT_COLOR[item.type] ?? "border-muted-foreground"}`}
                    />
                    <span
                      className="whitespace-nowrap shrink-0"
                      style={{ fontSize: 10, color: "var(--text-muted)", width: 68 }}
                    >
                      {item.date}
                    </span>
                    <span
                      style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}
