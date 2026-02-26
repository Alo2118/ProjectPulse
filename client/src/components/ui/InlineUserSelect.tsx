/**
 * InlineUserSelect - Click-to-edit user/assignee selector.
 * Displays an avatar (initials-based) by default; opens a searchable dropdown on click.
 * Fetches the full user list from GET /api/users on first open.
 * @module components/ui/InlineUserSelect
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Loader2, UserX } from 'lucide-react'
import api from '@services/api'
import type { User } from '@/types'
import { toast } from '@stores/toastStore'
import { getAvatarColorByName, getUserInitials } from '@utils/avatarColors'

interface DisplayUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface InlineUserSelectProps {
  /** Currently selected user ID, or null for unassigned */
  value: string | null
  /** Pre-loaded display data for the current assignee (avoids extra fetch for the badge) */
  displayUser?: DisplayUser | null
  onChange: (userId: string | null) => Promise<void> | void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  /** Show a "Nessuno" option to clear the selection */
  allowClear?: boolean
}

function avatarColor(firstName: string, lastName: string): string {
  return getAvatarColorByName(firstName, lastName).solid
}

function userInitials(firstName: string, lastName: string): string {
  return getUserInitials(firstName, lastName)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface AvatarProps {
  user: DisplayUser
  size: 'sm' | 'md'
}

function Avatar({ user, size }: AvatarProps) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
  const color = avatarColor(user.firstName, user.lastName)

  return (
    <span
      className={`${sizeClass} ${color} rounded-full inline-flex items-center justify-center text-white font-semibold flex-shrink-0`}
      aria-hidden="true"
    >
      {userInitials(user.firstName, user.lastName)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InlineUserSelect({
  value,
  displayUser,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
  allowClear = false,
}: InlineUserSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Fetch users on first open
  const fetchUsers = useCallback(async () => {
    if (users.length > 0) return
    setIsLoadingUsers(true)
    try {
      const response = await api.get<{ success: boolean; data: User[] }>('/users')
      if (response.data.success && Array.isArray(response.data.data)) {
        setUsers(response.data.data)
      }
    } catch {
      // Silently fail; the dropdown will be empty
    } finally {
      setIsLoadingUsers(false)
    }
  }, [users.length])

  const handleToggle = useCallback(() => {
    if (disabled || isSaving) return
    if (!isOpen) {
      void fetchUsers()
    }
    setIsOpen((prev) => !prev)
    setSearchQuery('')
  }, [disabled, isSaving, isOpen, fetchUsers])

  const handleSelect = useCallback(
    async (userId: string | null) => {
      if (userId === value) {
        setIsOpen(false)
        setSearchQuery('')
        return
      }

      setIsOpen(false)
      setSearchQuery('')
      setIsSaving(true)

      try {
        await onChange(userId)
      } catch {
        toast.error('Errore nel salvataggio')
      } finally {
        setIsSaving(false)
      }
    },
    [value, onChange]
  )

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return users
    return users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  const isSmall = size === 'sm'

  // Resolve what to show in the badge
  const currentUser: DisplayUser | null =
    displayUser ??
    (value ? (users.find((u) => u.id === value) ?? null) : null)

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Badge / trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          currentUser
            ? `Assegnato a ${currentUser.firstName} ${currentUser.lastName}. Clicca per cambiare`
            : 'Non assegnato. Clicca per assegnare'
        }
        className={[
          'inline-flex items-center gap-1.5 transition-all rounded-full',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:ring-1 hover:ring-cyan-500/40 dark:hover:ring-cyan-500/40',
        ].join(' ')}
      >
        {isSaving ? (
          <span
            className={`${isSmall ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-slate-700/50 dark:bg-slate-700/50 inline-flex items-center justify-center`}
          >
            <Loader2 size={12} className="animate-spin text-slate-400 dark:text-slate-400" />
          </span>
        ) : currentUser ? (
          <>
            <Avatar user={currentUser} size={size} />
            {!isSmall && (
              <span className="text-xs text-slate-300 dark:text-slate-300 whitespace-nowrap">
                {currentUser.firstName} {currentUser.lastName}
              </span>
            )}
          </>
        ) : (
          <span
            className={`${isSmall ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'} rounded-full bg-slate-700/50 dark:bg-slate-700/50 inline-flex items-center justify-center text-slate-500 dark:text-slate-500 flex-shrink-0`}
          >
            <UserX size={isSmall ? 10 : 12} aria-hidden="true" />
          </span>
        )}
        {!isSmall && !currentUser && !isSaving && (
          <span className="text-xs text-slate-500 dark:text-slate-500">Non assegnato</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleziona utente"
          className={[
            'absolute mt-1 z-50 w-56',
            'bg-slate-900 dark:bg-slate-900',
            'border border-cyan-500/25 dark:border-cyan-500/25',
            'rounded-lg',
            'shadow-[0_0_20px_rgba(6,182,212,0.12),_0_8px_20px_rgba(0,0,0,0.4)]',
            'transition-opacity duration-150 opacity-100',
          ].join(' ')}
        >
          {/* Search input */}
          <div className="p-2 border-b border-cyan-500/15 dark:border-cyan-500/15">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca utente..."
              className="w-full px-2 py-1 text-xs rounded bg-slate-800/60 dark:bg-slate-800/60 border border-cyan-500/20 dark:border-cyan-500/20 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_6px_rgba(6,182,212,0.2)] text-slate-100 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 transition-all"
              aria-label="Cerca utente"
            />
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {/* Clear / unassign option */}
            {allowClear && (
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                onClick={() => handleSelect(null)}
                className={[
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                  'hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 cursor-pointer transition-colors duration-100',
                  value === null ? 'bg-cyan-500/15 dark:bg-cyan-500/15 font-medium' : '',
                ].join(' ')}
              >
                <span className="w-6 h-6 rounded-full bg-slate-700/50 dark:bg-slate-700/50 inline-flex items-center justify-center text-slate-500 dark:text-slate-500 flex-shrink-0">
                  <UserX size={12} aria-hidden="true" />
                </span>
                <span className="text-slate-400 dark:text-slate-400">Nessuno</span>
              </button>
            )}

            {/* User list */}
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4 gap-2 text-slate-400 dark:text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Caricamento...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500">
                Nessun utente trovato
              </p>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = user.id === value

                return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(user.id)}
                    className={[
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                      'hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 cursor-pointer transition-colors duration-100',
                      isSelected ? 'bg-cyan-500/15 dark:bg-cyan-500/15 font-medium' : '',
                    ].join(' ')}
                  >
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${avatarColor(user.firstName, user.lastName)}`}
                      aria-hidden="true"
                    >
                      {userInitials(user.firstName, user.lastName)}
                    </span>
                    <span className="text-slate-300 dark:text-slate-300 truncate">
                      {user.firstName} {user.lastName}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
