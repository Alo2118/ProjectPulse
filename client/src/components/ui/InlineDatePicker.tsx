/**
 * InlineDatePicker - Click-to-edit date field.
 * Displays formatted date text by default; reveals a native date input on click.
 * Overdue dates render in red, today's date in amber.
 * @module components/ui/InlineDatePicker
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { toast } from '@stores/toastStore'

interface InlineDatePickerProps {
  /** ISO date string (e.g. "2026-02-15") or null */
  value: string | null
  onChange: (date: string | null) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
  className?: string
  showClear?: boolean
}

/**
 * Format an ISO date string into a localised display string.
 * Handles both "2026-02-15" and "2026-02-15T00:00:00.000Z" formats.
 * e.g. "2026-02-15" → "15 feb 2026"
 */
function formatDisplayDate(isoDate: string): string {
  const dateOnly = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate
  const date = new Date(dateOnly + 'T00:00:00')
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Return the ISO date string for today ("YYYY-MM-DD").
 */
function todayISO(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

/**
 * Classify a date value relative to today.
 */
function dateStatus(isoDate: string): 'overdue' | 'today' | 'future' {
  const today = todayISO()
  const dateOnly = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate
  if (dateOnly < today) return 'overdue'
  if (dateOnly === today) return 'today'
  return 'future'
}

export function InlineDatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'Nessuna data',
  className = '',
  showClear = false,
}: InlineDatePickerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the native input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.showPicker?.()
    }
  }, [isEditing])

  const handleTextClick = useCallback(() => {
    if (disabled || isSaving) return
    setIsEditing(true)
  }, [disabled, isSaving])

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value || null
      setIsEditing(false)
      setIsSaving(true)
      try {
        await onChange(newDate)
      } catch {
        toast.error('Errore nel salvataggio')
      } finally {
        setIsSaving(false)
      }
    },
    [onChange]
  )

  const handleBlur = useCallback(() => {
    // Revert to text display if user blurs without selecting a new date
    setIsEditing(false)
  }, [])

  const handleClear = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled || isSaving) return
      setIsSaving(true)
      try {
        await onChange(null)
      } catch {
        toast.error('Errore nel salvataggio')
      } finally {
        setIsSaving(false)
      }
    },
    [disabled, isSaving, onChange]
  )

  // --- Date input mode ---
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={value ? (value.includes('T') ? value.split('T')[0] : value) : ''}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={isSaving}
        className={`input text-xs px-2 py-0.5 w-32 focus:border-cyan-500/60 focus:shadow-[0_0_8px_rgba(6,182,212,0.25)] ${className}`}
        aria-label="Seleziona data"
      />
    )
  }

  // --- Text display mode ---
  const status = value ? dateStatus(value) : null

  const colorClass =
    status === 'overdue'
      ? 'text-red-400 dark:text-red-400'
      : status === 'today'
        ? 'text-amber-400 dark:text-amber-400'
        : 'text-slate-400 dark:text-slate-400'

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleTextClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleTextClick()
        }
      }}
      aria-label={value ? `Data: ${formatDisplayDate(value)}. Clicca per modificare` : 'Imposta data'}
      className={[
        'inline-flex items-center gap-1 text-xs transition-colors select-none',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:text-cyan-400 dark:hover:text-cyan-400',
        colorClass,
        className,
      ].join(' ')}
    >
      <Calendar size={12} className="flex-shrink-0" aria-hidden="true" />
      <span>{value ? formatDisplayDate(value) : placeholder}</span>
      {showClear && value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Rimuovi data"
          className="ml-0.5 rounded-full hover:bg-slate-700/60 dark:hover:bg-slate-700/60 transition-colors p-0.5"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 2L5 5L8 8L7 9L4 6L1 9L0 8L3 5L0 2L1 1L4 4L7 1L8 2Z" />
          </svg>
        </button>
      )}
    </span>
  )
}
