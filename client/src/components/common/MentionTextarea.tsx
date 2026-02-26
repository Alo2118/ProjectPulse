/**
 * MentionTextarea - Reusable textarea with WhatsApp-style @mention autocomplete
 *
 * Features:
 * - Floating panel above the textarea (WhatsApp-style)
 * - Click-outside-to-close
 * - Accent-aware regex (covers Italian/European names)
 * - "No results" empty state
 * - Auto-resize (grows with content, capped at maxRows)
 * - Lazy user fetch (only when first @ is typed)
 * - Keyboard navigation: ↑↓ navigate, Enter/Tab select, Escape close
 *
 * @module components/common/MentionTextarea
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { User } from '@/types'
import api from '@services/api'
import { getAvatarColor } from '@utils/avatarColors'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  direzione: 'Direzione',
  dipendente: 'Dipendente',
}

// ─── Regex: matches @ followed by accented-letter characters (European names) ─
// Must use function form (not constant) so the lastIndex is reset on each call.
const MENTION_REGEX = () => /@([A-Za-zÀ-öø-ÿ]*)$/

// ─── Highlight matching portion of text ───────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-bold text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MentionTextareaProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  /** Minimum visible rows (default 3) */
  minRows?: number
  /** Maximum rows before scrolling (default 10) */
  maxRows?: number
  className?: string
  /** Additional keydown handler (fires after mention key handling) */
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  /** Called when Enter is pressed with no mention open and no modifier key */
  onSubmit?: () => void
  id?: string
  autoFocus?: boolean
  required?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
  minRows = 3,
  maxRows = 10,
  className = '',
  onKeyDown,
  onSubmit,
  id,
  autoFocus,
  required,
}: MentionTextareaProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [usersFetched, setUsersFetched] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeItemRef = useRef<HTMLButtonElement>(null)

  // ── Auto-resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20
    const paddingV =
      parseInt(getComputedStyle(ta).paddingTop) +
      parseInt(getComputedStyle(ta).paddingBottom)
    const minH = lineHeight * minRows + paddingV
    const maxH = lineHeight * maxRows + paddingV

    ta.style.height = 'auto'
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, minH), maxH)}px`
    ta.style.overflowY = ta.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [value, minRows, maxRows])

  // ── Click-outside-to-close ───────────────────────────────────────────────
  useEffect(() => {
    if (mentionQuery === null) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMentionQuery(null)
        setMentionUsers([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionQuery])

  // ── Scroll active mention item into view ─────────────────────────────────
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [mentionIndex])

  // ── Lazy fetch users (only once, on first @) ─────────────────────────────
  const ensureUsersFetched = useCallback(async () => {
    if (usersFetched) return
    setUsersFetched(true)
    try {
      const res = await api.get<{ success: boolean; data: User[] }>(
        '/users?limit=100&isActive=true'
      )
      if (res.data.success) setAllUsers(res.data.data)
    } catch {
      // silently ignore
    }
  }, [usersFetched])

  // ── Handle text change ───────────────────────────────────────────────────
  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      onChange(val)

      const cursor = e.target.selectionStart ?? val.length
      const textBeforeCursor = val.slice(0, cursor)
      const match = textBeforeCursor.match(MENTION_REGEX())

      if (match) {
        await ensureUsersFetched()
        const query = match[1].toLowerCase()
        setMentionQuery(query)
        setMentionIndex(0)
        setMentionUsers(
          allUsers
            .filter(
              (u) =>
                !query ||
                u.firstName.toLowerCase().includes(query) ||
                u.lastName.toLowerCase().includes(query)
            )
            .slice(0, 6)
        )
      } else {
        setMentionQuery(null)
        setMentionUsers([])
      }
    },
    [onChange, ensureUsersFetched, allUsers]
  )

  // ── Insert selected mention ──────────────────────────────────────────────
  const insertMention = useCallback(
    (user: User) => {
      if (!textareaRef.current) return
      const cursor = textareaRef.current.selectionStart ?? value.length
      const before = value.slice(0, cursor)
      const after = value.slice(cursor)
      const withoutQuery = before.replace(MENTION_REGEX(), '')
      const mention = `@${user.firstName}${user.lastName} `
      const newVal = withoutQuery + mention + after
      onChange(newVal)
      setMentionQuery(null)
      setMentionUsers([])
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = (withoutQuery + mention).length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(pos, pos)
        }
      }, 0)
    },
    [value, onChange]
  )

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const hasMentionOpen = mentionQuery !== null && mentionUsers.length > 0
      const hasMentionNoResults = mentionQuery !== null && mentionUsers.length === 0

      if (hasMentionOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setMentionIndex((i) => Math.min(i + 1, mentionUsers.length - 1))
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setMentionIndex((i) => Math.max(i - 1, 0))
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          insertMention(mentionUsers[mentionIndex])
          return
        }
      }

      if (e.key === 'Escape' && (hasMentionOpen || hasMentionNoResults)) {
        e.preventDefault()
        setMentionQuery(null)
        setMentionUsers([])
        return
      }

      // Submit on plain Enter (no modifier, no mention open)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && mentionQuery === null) {
        onSubmit?.()
      }

      // Caller's custom handler
      onKeyDown?.(e)
    },
    [mentionQuery, mentionUsers, mentionIndex, insertMention, onKeyDown, onSubmit]
  )

  // ── Derived ──────────────────────────────────────────────────────────────
  const showDropdown = mentionQuery !== null
  const hasResults = mentionUsers.length > 0

  return (
    <div ref={containerRef} className="relative">
      {/* Mention panel — above the textarea */}
      {showDropdown && (
        <div
          className="absolute left-0 bottom-full mb-2 z-50 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          style={{ animation: 'mentionPanelIn 120ms ease-out' }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {mentionQuery ? `Risultati per "${mentionQuery}"` : 'Menziona qualcuno'}
            </p>
          </div>

          {/* User list or empty state */}
          {hasResults ? (
            <div className="max-h-60 overflow-y-auto overscroll-contain">
              {mentionUsers.map((user, idx) => {
                const color = getAvatarColor(user.firstName + user.lastName)
                const isActive = idx === mentionIndex
                return (
                  <button
                    key={user.id}
                    type="button"
                    ref={isActive ? activeItemRef : undefined}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(user)
                    }}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm text-left transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/25'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-sm flex-shrink-0`}
                    >
                      {user.firstName.charAt(0).toUpperCase()}
                      {user.lastName.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold truncate ${
                          isActive
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        <HighlightMatch
                          text={`${user.firstName} ${user.lastName}`}
                          query={mentionQuery ?? ''}
                        />
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </p>
                    </div>

                    {/* Active dot */}
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-sm text-gray-400 dark:text-gray-500">
              Nessun utente trovato per{' '}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                @{mentionQuery}
              </span>
            </div>
          )}

          {/* Keyboard hint footer */}
          {hasResults && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
              <span>
                <kbd className="font-mono">↑↓</kbd> naviga
              </span>
              <span>
                <kbd className="font-mono">↵</kbd> seleziona
              </span>
              <span>
                <kbd className="font-mono">Esc</kbd> chiudi
              </span>
            </div>
          )}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        required={required}
        style={{ resize: 'none', overflowY: 'hidden' }}
        className={className}
      />

      {/* Animation keyframe (injected once per render tree) */}
      <style>{`
        @keyframes mentionPanelIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  )
}
