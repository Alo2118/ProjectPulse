/**
 * Deterministic avatar color system (WhatsApp-style).
 * Single source of truth — replaces 5 duplicate implementations.
 * @module utils/avatarColors
 */

export interface AvatarColor {
  /** Tailwind bg class with dark variant (e.g. "bg-violet-100 dark:bg-violet-900/40") */
  bg: string
  /** Tailwind text class with dark variant */
  text: string
  /** Solid bg class for small avatars (e.g. "bg-violet-500") */
  solid: string
}

const AVATAR_COLORS: AvatarColor[] = [
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', solid: 'bg-violet-500' },
  { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300', solid: 'bg-sky-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', solid: 'bg-emerald-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', solid: 'bg-amber-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', solid: 'bg-rose-500' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', solid: 'bg-teal-500' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', solid: 'bg-indigo-500' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', solid: 'bg-orange-500' },
]

/** Get deterministic avatar color from a name string (hash-based). */
export function getAvatarColor(name: string): AvatarColor {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

/** Get deterministic avatar color from first + last name (charCode-based). */
export function getAvatarColorByName(firstName: string, lastName: string): AvatarColor {
  const index = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]!
}

/** Get user initials from first + last name. */
export function getUserInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
