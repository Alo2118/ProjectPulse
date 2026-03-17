import { Download, Plus, X } from "lucide-react"
import { TypePill } from "./TypePill"
import { cn, formatDate, formatFileSize, getUserInitials, getAvatarColor } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"

export interface DocVersion {
  id: string
  version: string
  createdAt: string
  notes?: string | null
  author?: { id: string; firstName: string; lastName: string } | null
}

export interface DocDrawerData {
  id: string
  title: string
  type: string
  status: string
  version: string
  description?: string | null
  filePath?: string | null
  fileSize?: number | null
  project?: { id: string; name: string } | null
  author?: { id: string; firstName: string; lastName: string } | null
  versions?: DocVersion[]
  createdAt: string
  updatedAt: string
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Approvato",
    className: "bg-green-500/8 text-green-400 border-green-500/20",
  },
  review: {
    label: "In revisione",
    className: "bg-yellow-500/8 text-yellow-400 border-yellow-500/20",
  },
  draft: {
    label: "Bozza",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
  obsolete: {
    label: "Obsoleto",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
}

function StatusBadgeInline({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border font-semibold whitespace-nowrap",
        config.className
      )}
      style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px" }}
    >
      {config.label}
    </span>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p
        className="font-bold uppercase tracking-widest"
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          marginBottom: "10px",
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Info grid item ────────────────────────────────────────────────────────────

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block font-semibold uppercase tracking-wider"
        style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px" }}
      >
        {label}
      </label>
      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>
        {children}
      </div>
    </div>
  )
}

// ── Project dot colors (deterministic) ───────────────────────────────────────

const DOT_COLORS = [
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#22d3ee",
  "#22c55e",
  "#e11d48",
  "#eab308",
  "#14b8a6",
]

function getProjectDotColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length]
}

// ── Main component ────────────────────────────────────────────────────────────

interface DocDrawerProps {
  doc: DocDrawerData | null
  open: boolean
  onClose: () => void
  onNewVersion?: () => void
  onDownload?: (doc: DocDrawerData) => void
}

export function DocDrawer({ doc, open, onClose, onNewVersion, onDownload }: DocDrawerProps) {
  const fileName = doc?.filePath ? doc.filePath.split("/").pop() ?? doc.filePath : null
  const projColor = doc?.project ? getProjectDotColor(doc.project.name) : null
  const authorInitials =
    doc?.author ? getUserInitials(doc.author.firstName, doc.author.lastName) : null
  const authorColorClass =
    doc?.author ? getAvatarColor(`${doc.author.firstName}${doc.author.lastName}`) : null
  const authorShort =
    doc?.author ? `${doc.author.firstName[0]}. ${doc.author.lastName}` : null

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 200,
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "400px",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--border-default)",
          zIndex: 201,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "hidden",
        }}
      >
        {doc && (
          <>
            {/* Header */}
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid var(--border-default)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Badges */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  <TypePill type={doc.type} />
                  <StatusBadgeInline status={doc.status} />
                </div>
                {/* Title */}
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: "var(--text-primary)",
                  }}
                >
                  {doc.title}
                </div>
                {/* Filename */}
                {fileName && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--text-muted)",
                      marginTop: "3px",
                      fontFamily: "monospace",
                    }}
                  >
                    {fileName}
                    {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "5px",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)"
                  e.currentTarget.style.borderColor = "var(--border-default)"
                }}
              >
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "18px 20px",
                flex: 1,
                overflowY: "auto",
              }}
            >
              {/* Info grid */}
              <DrawerSection title="Informazioni">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <InfoItem label="Progetto">
                    {doc.project ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: projColor ?? "#64748b",
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                        <span className="truncate" style={{ fontSize: "12px" }}>
                          {doc.project.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </InfoItem>

                  <InfoItem label="Responsabile">
                    {authorInitials && authorColorClass ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full text-white font-bold shrink-0",
                            authorColorClass
                          )}
                          style={{ width: "18px", height: "18px", fontSize: "8px" }}
                        >
                          {authorInitials}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {authorShort}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </InfoItem>

                  <InfoItem label="Ultimo aggiornamento">
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-data, 'DM Sans', sans-serif)",
                      }}
                    >
                      {formatDate(doc.updatedAt)}
                    </span>
                  </InfoItem>

                  <InfoItem label="Dimensione">
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-data, 'DM Sans', sans-serif)",
                      }}
                    >
                      {doc.fileSize ? formatFileSize(doc.fileSize) : "—"}
                    </span>
                  </InfoItem>
                </div>
              </DrawerSection>

              {/* Description */}
              {doc.description && (
                <DrawerSection title="Descrizione">
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      background: "var(--bg-elevated)",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {doc.description}
                  </div>
                </DrawerSection>
              )}

              {/* Version history */}
              <DrawerSection
                title={`Storico versioni${doc.versions && doc.versions.length > 0 ? ` · ${doc.versions.length} revisioni` : ""}`}
              >
                {doc.versions && doc.versions.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {doc.versions.map((ver, i) => {
                      const isCurrent = i === 0
                      const verAuthorShort = ver.author
                        ? `${ver.author.firstName[0]}. ${ver.author.lastName}`
                        : null

                      return (
                        <div
                          key={ver.id}
                          className="flex items-center gap-2.5"
                          style={{
                            padding: "8px 10px",
                            borderRadius: "5px",
                            background: isCurrent
                              ? "rgba(234,179,8,0.05)"
                              : "var(--bg-elevated)",
                            border: isCurrent
                              ? "1px solid rgba(234,179,8,0.2)"
                              : "1px solid var(--border-subtle)",
                          }}
                        >
                          {/* Rev number */}
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              fontFamily: "var(--font-heading, 'Syne', sans-serif)",
                              color: isCurrent ? "#facc15" : "var(--text-secondary)",
                              width: "48px",
                              flexShrink: 0,
                            }}
                          >
                            {`Rev. ${ver.version}`}
                          </span>

                          {/* Date */}
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--text-muted)",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              width: "80px",
                              fontFamily: "var(--font-data, 'DM Sans', sans-serif)",
                            }}
                          >
                            {formatDate(ver.createdAt)}
                          </span>

                          {/* Author + note */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-1.5">
                              {verAuthorShort && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-secondary)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {verAuthorShort}
                                </span>
                              )}
                              {isCurrent && (
                                <Badge
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 h-3.5 shrink-0"
                                  style={{
                                    fontSize: "9px",
                                    padding: "1px 5px",
                                    borderRadius: "2px",
                                    background: "rgba(234,179,8,0.12)",
                                    color: "#facc15",
                                    border: "1px solid rgba(234,179,8,0.2)",
                                    fontWeight: 700,
                                  }}
                                >
                                  Corrente
                                </Badge>
                              )}
                            </div>
                            {ver.notes && (
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  marginTop: "1px",
                                }}
                              >
                                {ver.notes}
                              </p>
                            )}
                          </div>

                          {/* Download version btn */}
                          <button
                            type="button"
                            title="Scarica"
                            className="ver-dl-btn"
                            style={{
                              width: "22px",
                              height: "22px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "3px",
                              border: "1px solid var(--border-default)",
                              color: "var(--text-muted)",
                              background: "transparent",
                              cursor: "pointer",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#4ade80"
                              e.currentTarget.style.borderColor = "rgba(34,197,94,0.35)"
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = "var(--text-muted)"
                              e.currentTarget.style.borderColor = "var(--border-default)"
                            }}
                          >
                            <Download style={{ width: "11px", height: "11px" }} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Nessuna versione registrata.
                  </p>
                )}
              </DrawerSection>
            </div>

            {/* Footer actions */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border-default)",
                display: "flex",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => onDownload?.(doc)}
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 13px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid rgba(234,179,8,0.3)",
                  background: "rgba(234,179,8,0.1)",
                  color: "#facc15",
                  transition: "all 0.18s",
                  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(234,179,8,0.2)"
                  e.currentTarget.style.borderColor = "rgba(234,179,8,0.6)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(234,179,8,0.1)"
                  e.currentTarget.style.borderColor = "rgba(234,179,8,0.3)"
                }}
              >
                <Download style={{ width: "13px", height: "13px" }} />
                Scarica corrente
              </button>
              <button
                type="button"
                onClick={onNewVersion}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 13px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  transition: "all 0.18s",
                  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(45,140,240,0.35)"
                  e.currentTarget.style.color = "#60a5fa"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)"
                  e.currentTarget.style.color = "var(--text-primary)"
                }}
              >
                <Plus style={{ width: "13px", height: "13px" }} />
                Nuova rev.
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
