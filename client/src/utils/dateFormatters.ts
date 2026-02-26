/**
 * Shared date formatting utilities - replaces local formatDate functions
 * across the codebase with a single consistent implementation.
 * @module utils/dateFormatters
 */

const TERMINAL_STATUSES = ['done', 'cancelled']

/**
 * Full date: "24 feb 2026"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Short date: "24 feb"
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

/**
 * Relative date: "3g fa" / "Oggi" / "Domani" / "tra 5g" or short date
 */
export function formatDateRelative(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return `${Math.abs(diff)}g fa`
  if (diff === 0) return 'Oggi'
  if (diff === 1) return 'Domani'
  if (diff < 7) return `tra ${diff}g`

  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

/**
 * Date + time: "24 feb, 14:30"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Relative time for recent events: "Ora" / "5min fa" / "3h fa" / "2g fa" or short date
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ora'
  if (diffMin < 60) return `${diffMin}min fa`
  if (diffHours < 24) return `${diffHours}h fa`
  if (diffDays < 7) return `${diffDays}g fa`
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

// ─── Duration / hours formatting ────────────────────────────────────────────

/**
 * Minutes → human-readable duration: "2h 30m", "45m", "0m"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Decimal hours → human-readable duration: 2.5 → "2h 30m", 0 → "0h"
 */
export function formatHoursFromDecimal(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return '0h'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Minutes → compact hours string for charts / tooltips: "2h 30m"
 * Same as formatDuration but returns "0h" instead of "0m" for zero.
 */
export function formatMinutesAsHours(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0h'
  return formatDuration(minutes)
}

// ─── Date utilities ─────────────────────────────────────────────────────────

/**
 * Checks whether a task/entity is overdue.
 * Returns true ONLY if due date is past AND status is NOT done/cancelled.
 */
export function isOverdue(dateString: string | null | undefined, status: string): boolean {
  if (!dateString) return false
  const due = new Date(dateString)
  return due < new Date() && !TERMINAL_STATUSES.includes(status)
}

/**
 * Returns Tailwind text color classes for due date display:
 * - Red: overdue (past due, not completed/cancelled)
 * - Amber: due within 2 days
 * - Gray: normal
 */
export function getDueDateColor(dateString: string | null | undefined, status: string): string {
  if (!dateString) return 'text-gray-500 dark:text-gray-400'
  if (TERMINAL_STATUSES.includes(status)) return 'text-gray-500 dark:text-gray-400'

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dateString)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-red-600 dark:text-red-400'
  if (diffDays <= 2) return 'text-amber-600 dark:text-amber-400'
  return 'text-gray-500 dark:text-gray-400'
}
