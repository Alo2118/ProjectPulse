import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { it } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, fmt, { locale: it })
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: it })
}

export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getUserInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
  "bg-pink-500", "bg-indigo-500",
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getDeadlineUrgency(
  dueDate: string | null | undefined
): "overdue" | "urgent" | "soon" | "normal" | "none" {
  if (!dueDate) return "none"
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "overdue"
  if (diffDays <= 3) return "urgent"
  if (diffDays <= 7) return "soon"
  return "normal"
}

export function formatDaysRemaining(dueDate: string | null | undefined): string {
  if (!dueDate) return ""
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `${Math.abs(diffDays)}gg scaduto`
  if (diffDays === 0) return "Oggi!"
  return `${diffDays}gg`
}

export function formatRecurrencePattern(pattern: string | null | undefined): string {
  if (!pattern) return ""
  try {
    const p = JSON.parse(pattern) as { frequency?: string; interval?: number }
    if (p.frequency === "daily") return "Giornaliero"
    if (p.frequency === "weekly" && p.interval === 1) return "Settimanale"
    if (p.frequency === "weekly" && p.interval === 2) return "Ogni 2 sett"
    if (p.frequency === "monthly") return "Mensile"
    return p.frequency ?? ""
  } catch {
    return ""
  }
}
