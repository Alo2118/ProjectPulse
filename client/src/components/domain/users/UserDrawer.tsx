import { useState, useEffect } from "react"
import { LogIn, Edit, Upload, Plus } from "lucide-react"
import { toast } from "sonner"
import { Drawer } from "@/components/common/Drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUserInitials, getAvatarColor } from "@/lib/utils"
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/constants"
import { useUpdateUser, useCreateUser } from "@/hooks/api/useUsers"
import type { UserRole } from "@/types"
import type { UserRowData } from "./UserRow"

interface RecentLogEntry {
  type: "login" | "edit" | "create" | "upload"
  text: string
  time: string
}

interface UserDrawerProps {
  user: UserRowData | null
  isNew?: boolean
  isOpen: boolean
  onClose: () => void
  recentLog?: RecentLogEntry[]
}

const LOG_ICON_STYLES: Record<string, { bg: string; color: string }> = {
  login:  { bg: "rgba(34,197,94,.1)",   color: "#4ade80" },
  edit:   { bg: "rgba(234,179,8,.08)",  color: "#facc15" },
  create: { bg: "rgba(99,102,241,.08)", color: "#a5b4fc" },
  upload: { bg: "rgba(34,211,238,.08)", color: "#22d3ee" },
}

function LogIcon({ type }: { type: string }) {
  const style = LOG_ICON_STYLES[type] ?? LOG_ICON_STYLES.edit
  const Icon = type === "login" ? LogIn : type === "create" ? Plus : type === "upload" ? Upload : Edit
  return (
    <div
      className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center flex-shrink-0"
      style={{ background: style.bg, color: style.color }}
    >
      <Icon className="w-[10px] h-[10px]" />
    </div>
  )
}

export function UserDrawer({ user, isNew = false, isOpen, onClose, recentLog }: UserDrawerProps) {
  const updateUser = useUpdateUser()
  const createUser = useCreateUser()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("dipendente")

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setEmail(user.email)
      setRole(user.role)
    } else {
      setFirstName("")
      setLastName("")
      setEmail("")
      setRole("dipendente")
    }
  }, [user])

  const initials = user ? getUserInitials(user.firstName, user.lastName) : "NU"
  const avatarColor = user ? getAvatarColor(`${user.firstName} ${user.lastName}`) : "#6366f1"
  const roleColors = ROLE_COLORS[role] ?? ROLE_COLORS.guest

  async function handleSave() {
    try {
      if (isNew) {
        await createUser.mutateAsync({ firstName, lastName, email, role })
        toast.success("Utente creato con successo")
      } else if (user) {
        await updateUser.mutateAsync({ id: user.id, firstName, lastName, email, role })
        toast.success("Modifiche salvate")
      }
      onClose()
    } catch {
      toast.error("Errore nel salvataggio")
    }
  }

  async function handleToggleActive() {
    if (!user) return
    try {
      await updateUser.mutateAsync({ id: user.id, isActive: !user.isActive })
      toast.success(user.isActive ? "Utente disattivato" : "Utente riattivato")
      onClose()
    } catch {
      toast.error("Errore nell'operazione")
    }
  }

  const isPending = updateUser.isPending || createUser.isPending

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={isNew ? "Nuovo utente" : "Dettaglio utente"} width={420}>
      {/* User hero (edit mode only) */}
      {!isNew && user && (
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[var(--border-default)]">
          <div
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[15px] font-bold flex-shrink-0"
            style={{ background: avatarColor + "20", color: avatarColor }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[var(--text-primary)]">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-[2px]">{user.email}</div>
            <div className="flex items-center gap-[6px] mt-[5px]">
              <span
                className="inline-flex items-center px-2 py-[1px] rounded-[4px] text-[10px] font-bold uppercase tracking-[.04em] border"
                style={{ background: roleColors.bg, color: roleColors.text, borderColor: roleColors.border }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              {user.isActive !== false ? (
                <span
                  className="inline-flex items-center gap-[4px] px-2 py-[1px] rounded-[4px] text-[10px] font-semibold border"
                  style={{ background: "rgba(34,197,94,.08)", color: "#4ade80", borderColor: "rgba(34,197,94,.2)" }}
                >
                  <span className="w-[5px] h-[5px] rounded-full bg-[#4ade80]" />
                  Attivo
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-[4px] px-2 py-[1px] rounded-[4px] text-[10px] font-semibold border"
                  style={{ background: "rgba(100,116,139,.1)", color: "#64748b", borderColor: "rgba(100,116,139,.2)" }}
                >
                  <span className="w-[5px] h-[5px] rounded-full bg-[#64748b]" />
                  Disattivato
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="mb-5">
        <div
          className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--text-muted)] mb-[10px] pb-[6px] border-b border-[var(--border-subtle)]"
        >
          Dati utente
        </div>
        <div className="grid grid-cols-2 gap-[10px] mb-[10px]">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-[10px] font-bold uppercase tracking-[.06em] text-[var(--text-muted)]">
              Nome
            </Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-8 text-[12px]"
              placeholder="Nome"
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label className="text-[10px] font-bold uppercase tracking-[.06em] text-[var(--text-muted)]">
              Cognome
            </Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-8 text-[12px]"
              placeholder="Cognome"
            />
          </div>
        </div>
        <div className="flex flex-col gap-[5px] mb-[10px]">
          <Label className="text-[10px] font-bold uppercase tracking-[.06em] text-[var(--text-muted)]">
            Email
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-[12px]"
            placeholder="email@esempio.it"
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-[10px] font-bold uppercase tracking-[.06em] text-[var(--text-muted)]">
            Ruolo
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="direzione">Direzione</SelectItem>
              <SelectItem value="dipendente">Dipendente</SelectItem>
              <SelectItem value="guest">Ospite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recent activity log (existing users only) */}
      {!isNew && recentLog && recentLog.length > 0 && (
        <div className="mb-5">
          <div
            className="text-[10px] font-bold uppercase tracking-[.1em] text-[var(--text-muted)] mb-[10px] pb-[6px] border-b border-[var(--border-subtle)]"
          >
            Attività recente
          </div>
          <div className="flex flex-col gap-[5px]">
            {recentLog.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-[10px] py-[6px] rounded-[5px] bg-[var(--bg-elevated)]"
              >
                <LogIcon type={entry.type} />
                <span className="flex-1 text-[11px] text-[var(--text-secondary)]">{entry.text}</span>
                <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t border-[var(--border-default)]">
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={isPending}
          style={{
            background: "rgba(99,102,241,.1)",
            color: "#a5b4fc",
            borderColor: "rgba(99,102,241,.3)",
            border: "1px solid",
          }}
        >
          {isPending ? "Salvataggio..." : "Salva modifiche"}
        </Button>
        {!isNew && user && (
          <Button
            variant="outline"
            onClick={handleToggleActive}
            disabled={isPending}
            style={{
              background: "rgba(239,68,68,.08)",
              color: "#f87171",
              borderColor: "rgba(239,68,68,.2)",
              border: "1px solid",
            }}
          >
            {user.isActive !== false ? "Disattiva" : "Riattiva"}
          </Button>
        )}
      </div>
    </Drawer>
  )
}
