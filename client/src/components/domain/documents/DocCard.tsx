import { motion } from "framer-motion"
import { TypePill } from "./TypePill"
import { RevBadge } from "./RevBadge"
import { cn, formatDate, formatFileSize, getUserInitials, getAvatarColor } from "@/lib/utils"

export interface DocCardData {
  id: string
  title: string
  type: string
  status: string
  version: string
  filePath?: string | null
  fileSize?: number | null
  project?: { id: string; name: string } | null
  author?: { id: string; firstName: string; lastName: string } | null
  createdAt: string
  updatedAt: string
}

interface DocCardProps {
  doc: DocCardData
  onClick: () => void
  statusBadge: React.ReactNode
}

/**
 * Document card for project-grouping view.
 * Matches the mockup's .doc-card style:
 *   background: var(--bg-elevated), border: var(--border-subtle), padding: 10px 12px
 *   hover: border-color yellow glow
 */
export function DocCard({ doc, onClick, statusBadge }: DocCardProps) {
  const authorInitials =
    doc.author
      ? getUserInitials(doc.author.firstName, doc.author.lastName)
      : null
  const authorColorClass =
    doc.author
      ? getAvatarColor(`${doc.author.firstName}${doc.author.lastName}`)
      : null
  const authorShort =
    doc.author ? `${doc.author.firstName[0]}. ${doc.author.lastName}` : null

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="cursor-pointer flex flex-col gap-2"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        padding: "10px 12px",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(234,179,8,0.25)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--border-subtle)"
      }}
    >
      {/* Top: title + rev badge */}
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-semibold leading-snug flex-1 min-w-0 line-clamp-2"
          style={{ fontSize: "12px", color: "var(--text-primary)" }}
        >
          {doc.title}
        </span>
        <RevBadge version={`Rev. ${doc.version}`} />
      </div>

      {/* Type pill + status badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <TypePill type={doc.type} />
        {statusBadge}
      </div>

      {/* Bottom: author + date + size */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {authorInitials && authorColorClass && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full text-white font-bold shrink-0",
                authorColorClass
              )}
              style={{ width: "18px", height: "18px", fontSize: "8px" }}
            >
              {authorInitials}
            </span>
          )}
          {authorShort && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              {authorShort}
            </span>
          )}
          {!authorShort && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              {formatDate(doc.updatedAt)}
            </span>
          )}
        </div>
        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
          {doc.fileSize ? formatFileSize(doc.fileSize) : formatDate(doc.updatedAt)}
        </span>
      </div>
    </motion.div>
  )
}
