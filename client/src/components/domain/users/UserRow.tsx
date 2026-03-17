import { Edit2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserInitials, getAvatarColor, formatRelative } from "@/lib/utils"
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants"
import type { UserRole } from "@/types"

export interface UserRowData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  isActive?: boolean
  lastLoginAt?: string | null
  departmentName?: string | null
}

interface UserRowProps {
  user: UserRowData
  onClick: (user: UserRowData) => void
  onEdit?: (user: UserRowData) => void
  onDelete?: (user: UserRowData) => void
}

/** Determine last-access colour class from timestamp */
function getLastAccessClass(lastLoginAt?: string | null): string {
  if (!lastLoginAt) return "text-[var(--text-muted)]"
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  const hours = diff / (1000 * 60 * 60)
  if (hours < 24) return "text-[#4ade80]"       // today → green
  if (hours > 24 * 30) return "text-[#f87171]"   // >30d → red
  return "text-[var(--text-secondary)]"
}

export function UserRow({ user, onClick, onEdit, onDelete }: UserRowProps) {
  const initials = getUserInitials(user.firstName, user.lastName)
  const avatarColor = getAvatarColor(`${user.firstName} ${user.lastName}`)
  const roleColors = ROLE_COLORS[user.role] ?? ROLE_COLORS.guest
  const lastAccessClass = getLastAccessClass(user.lastLoginAt)
  const lastAccessLabel = user.lastLoginAt ? formatRelative(user.lastLoginAt) : "Mai"

  return (
    <tr
      className="cursor-pointer transition-colors duration-[120ms] group"
      onClick={() => onClick(user)}
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Utente: avatar + nome + email */}
      <td className="px-3 py-[10px] align-middle">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-[var(--border)]"
            style={{ background: avatarColor + "20", color: avatarColor }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-[1px]">
              {user.email}
            </div>
          </div>
        </div>
      </td>

      {/* Ruolo */}
      <td className="px-3 py-[10px] align-middle w-[110px]">
        <span
          className="inline-flex items-center px-2 py-[2px] rounded-[4px] text-[10px] font-bold uppercase tracking-[.04em] border whitespace-nowrap"
          style={{
            background: roleColors.bg,
            color: roleColors.text,
            borderColor: roleColors.border,
          }}
        >
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </td>

      {/* Stato */}
      <td className="px-3 py-[10px] align-middle w-[100px]">
        {user.isActive !== false ? (
          <span
            className="inline-flex items-center gap-[4px] px-2 py-[2px] rounded-[4px] text-[11px] font-semibold border"
            style={{
              background: "rgba(34,197,94,.08)",
              color: "#4ade80",
              borderColor: "rgba(34,197,94,.2)",
            }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-[#4ade80] flex-shrink-0" />
            Attivo
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-[4px] px-2 py-[2px] rounded-[4px] text-[11px] font-semibold border"
            style={{
              background: "rgba(100,116,139,.1)",
              color: "#64748b",
              borderColor: "rgba(100,116,139,.2)",
            }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-[#64748b] flex-shrink-0" />
            Disattivato
          </span>
        )}
      </td>

      {/* Ultimo accesso */}
      <td className="px-3 py-[10px] align-middle w-[130px]">
        <span className={cn("text-[11px]", lastAccessClass)}>{lastAccessLabel}</span>
      </td>

      {/* Dipartimento */}
      <td className="px-3 py-[10px] align-middle w-[130px]">
        {user.departmentName ? (
          <span className="text-[12px] text-[var(--text-secondary)]">{user.departmentName}</span>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">—</span>
        )}
      </td>

      {/* Actions (visible on row hover) */}
      <td className="px-3 py-[10px] align-middle w-[80px]">
        <div
          className="flex items-center gap-[5px] opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="w-[26px] h-[26px] flex items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-pointer transition-all duration-[150ms] hover:border-[rgba(45,140,240,.35)] hover:text-[#60a5fa]"
              title="Modifica utente"
            >
              <Edit2 className="w-[11px] h-[11px]" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(user)}
              className="w-[26px] h-[26px] flex items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-pointer transition-all duration-[150ms] hover:border-[rgba(239,68,68,.35)] hover:text-[#f87171]"
              title="Elimina utente"
            >
              <Trash2 className="w-[11px] h-[11px]" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
