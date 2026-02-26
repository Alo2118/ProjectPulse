/**
 * InlineTextInput - Click-to-edit text or number input.
 * Renders as a clickable text label; entering edit mode shows an input field.
 * Supports optimistic saves with a spinner during async onChange.
 * @module components/ui/InlineTextInput
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@stores/toastStore'

export interface InlineTextInputProps {
  value: string
  onChange: (value: string) => Promise<void> | void
  type?: 'text' | 'number'
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function InlineTextInput({
  value,
  onChange,
  type = 'text',
  disabled = false,
  placeholder = '—',
  className = '',
}: InlineTextInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when external value changes (e.g. store update)
  useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [value, isEditing])

  // Auto-focus & select-all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = useCallback(() => {
    if (disabled || isSaving) return
    setDraft(value)
    setIsEditing(true)
  }, [disabled, isSaving, value])

  const handleSave = useCallback(async () => {
    const trimmed = type === 'text' ? draft.trim() : draft
    setIsEditing(false)

    // Skip save if unchanged
    if (trimmed === value) return

    setIsSaving(true)
    try {
      await onChange(trimmed)
    } catch {
      toast.error('Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }, [draft, value, type, onChange])

  const handleCancel = useCallback(() => {
    setDraft(value)
    setIsEditing(false)
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleBlur = useCallback(() => {
    void handleSave()
  }, [handleSave])

  const isNumber = type === 'number'

  // --- Edit mode ---
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        placeholder={placeholder}
        className={[
          'text-sm px-2 py-0.5 border border-blue-300 dark:border-blue-600 rounded',
          'outline-none focus:ring-1 focus:ring-blue-500',
          'bg-white dark:bg-surface-800 text-gray-900 dark:text-gray-100',
          isNumber ? 'w-20 text-right' : 'w-full',
          className,
        ].join(' ')}
        aria-label="Modifica valore"
      />
    )
  }

  // --- Display mode ---
  const isEmpty = value === '' || value == null
  const displayText = isEmpty ? placeholder : value

  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-label={`Valore: ${displayText}. Clicca per modificare`}
      title={isEmpty ? undefined : String(value)}
      className={[
        'inline-flex items-center gap-1 text-sm transition-colors select-none',
        isNumber ? 'justify-end' : '',
        isEmpty ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-100',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-0.5 rounded',
        'truncate',
        className,
      ].join(' ')}
    >
      {isSaving && (
        <Loader2 size={12} className="animate-spin flex-shrink-0 text-gray-400" aria-hidden="true" />
      )}
      <span className="truncate">{displayText}</span>
    </span>
  )
}
