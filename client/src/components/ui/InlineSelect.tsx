/**
 * InlineSelect - Click-to-edit dropdown displayed as a badge.
 * Renders as a compact badge by default; opens a floating dropdown on click.
 * Supports optimistic updates with rollback on error.
 * @module components/ui/InlineSelect
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@stores/toastStore'

export interface InlineSelectOption {
  value: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  /** Tailwind text color class e.g. 'text-blue-500' */
  color?: string
  /** Tailwind bg class e.g. 'bg-blue-100' */
  bgColor?: string
  /** Tailwind dot color class e.g. 'bg-blue-500' */
  dotColor?: string
}

interface InlineSelectProps {
  value: string
  options: InlineSelectOption[]
  onChange: (value: string) => Promise<void> | void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function InlineSelect({
  value,
  options,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}: InlineSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [displayValue, setDisplayValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync displayValue when external value changes
  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
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
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleToggle = useCallback(() => {
    if (disabled || isSaving) return
    setIsOpen((prev) => !prev)
  }, [disabled, isSaving])

  const handleSelect = useCallback(
    async (newValue: string) => {
      if (newValue === displayValue) {
        setIsOpen(false)
        return
      }

      const previousValue = displayValue
      setDisplayValue(newValue)
      setIsOpen(false)
      setIsSaving(true)

      try {
        await onChange(newValue)
      } catch {
        // Rollback to previous value on error
        setDisplayValue(previousValue)
        toast.error('Errore nel salvataggio')
      } finally {
        setIsSaving(false)
      }
    },
    [displayValue, onChange]
  )

  const currentOption = options.find((o) => o.value === displayValue) ?? options[0]

  if (!currentOption) return null

  const BadgeIcon = currentOption.icon
  const isSmall = size === 'sm'

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Badge trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all',
          'cursor-pointer',
          currentOption.bgColor ?? 'bg-gray-100 dark:bg-surface-800',
          currentOption.color ?? 'text-gray-700 dark:text-gray-300',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600',
        ].join(' ')}
      >
        {isSaving ? (
          <Loader2 size={12} className="animate-spin flex-shrink-0" />
        ) : (
          BadgeIcon && <BadgeIcon size={12} className="flex-shrink-0" />
        )}
        {currentOption.dotColor && !isSaving && (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${currentOption.dotColor}`} />
        )}
        {!isSmall && <span>{currentOption.label}</span>}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleziona opzione"
          className={[
            'absolute mt-1 z-50',
            'bg-white dark:bg-surface-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg py-1 min-w-[160px]',
            'transition-opacity duration-150 opacity-100',
          ].join(' ')}
        >
          {options.map((option) => {
            const OptionIcon = option.icon
            const isSelected = option.value === displayValue

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={[
                  'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
                  'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 font-medium'
                    : '',
                ].join(' ')}
              >
                {OptionIcon && (
                  <span className={option.color}>
                    <OptionIcon size={14} />
                  </span>
                )}
                {option.dotColor && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${option.dotColor}`} />
                )}
                <span className={option.color ?? 'text-gray-700 dark:text-gray-300'}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
