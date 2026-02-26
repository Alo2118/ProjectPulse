/**
 * useKeyboardShortcuts - Global keyboard shortcut hook with sequence detection
 * Supports multi-key sequences (e.g., G then T) and single-key/combo shortcuts.
 * @module hooks/useKeyboardShortcuts
 */

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export interface ShortcutDefinition {
  /** Key sequence, e.g. ['g', 't'] for sequence, ['ctrl+k'] for combo */
  keys: string[]
  /** Display label, e.g. "Vai ai Task" */
  label: string
  /** Category group, e.g. "Navigazione", "Azioni" */
  category: string
  action: () => void
  /** true for multi-key sequences such as G → T */
  isSequence?: boolean
}

interface UseKeyboardShortcutsOptions {
  onOpenSearch?: () => void
  onOpenShortcutsModal?: () => void
  /** Whether shortcuts are active. Default: true */
  enabled?: boolean
}

/** Tags whose focus should suppress shortcut handling */
const SUPPRESSED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (SUPPRESSED_TAGS.has(target.tagName)) return true
  if (target.isContentEditable) return true
  return false
}

/** Normalise a key combo string, e.g. "Ctrl+K" → "ctrl+k" */
function normalisedCombo(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.metaKey) parts.push('meta')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

export function useKeyboardShortcuts({
  onOpenSearch,
  onOpenShortcutsModal,
  enabled = true,
}: UseKeyboardShortcutsOptions): { shortcuts: ShortcutDefinition[] } {
  const navigate = useNavigate()
  // Tracks the last key pressed for sequence detection
  const lastKeyRef = useRef<string | null>(null)
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      // ── Navigation sequences (G + letter) ──────────────────────────────
      {
        keys: ['g', 'd'],
        label: 'Vai alla Dashboard',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/dashboard'),
      },
      {
        keys: ['g', 'p'],
        label: 'Vai ai Progetti',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/projects'),
      },
      {
        keys: ['g', 't'],
        label: 'Vai ai Task',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/tasks'),
      },
      {
        keys: ['g', 'k'],
        label: 'Vai al Kanban',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/kanban'),
      },
      {
        keys: ['g', 'g'],
        label: 'Vai al Gantt',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/gantt'),
      },
      {
        keys: ['g', 'r'],
        label: 'Vai ai Report',
        category: 'Navigazione',
        isSequence: true,
        action: () => navigate('/reports/weekly'),
      },
      // ── Action shortcuts ────────────────────────────────────────────────
      {
        keys: ['c'],
        label: 'Crea nuovo Task',
        category: 'Azioni',
        isSequence: false,
        action: () => navigate('/tasks/new'),
      },
      {
        keys: ['?'],
        label: 'Mostra scorciatoie',
        category: 'Azioni',
        isSequence: false,
        action: () => onOpenShortcutsModal?.(),
      },
      {
        keys: ['ctrl+k', 'meta+k'],
        label: 'Apri ricerca',
        category: 'Azioni',
        isSequence: false,
        action: () => onOpenSearch?.(),
      },
    ],
    [navigate, onOpenSearch, onOpenShortcutsModal]
  )

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current !== null) {
      clearTimeout(sequenceTimerRef.current)
      sequenceTimerRef.current = null
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      if (isEditableTarget(e.target)) return

      const combo = normalisedCombo(e)
      const plainKey = e.key.toLowerCase()

      // ── Combo shortcuts (Ctrl+K / Meta+K) ────────────────────────────
      for (const shortcut of shortcuts) {
        if (!shortcut.isSequence && shortcut.keys.some((k) => k.toLowerCase() === combo)) {
          e.preventDefault()
          clearSequenceTimer()
          lastKeyRef.current = null
          shortcut.action()
          return
        }
      }

      // ── Sequence: if last key was 'g', check second key ───────────────
      if (lastKeyRef.current === 'g') {
        const matched = shortcuts.find(
          (s) =>
            s.isSequence &&
            s.keys[0] === 'g' &&
            s.keys[1] === plainKey
        )
        if (matched) {
          e.preventDefault()
          clearSequenceTimer()
          lastKeyRef.current = null
          matched.action()
          return
        }
        // Second key didn't match — reset sequence
        clearSequenceTimer()
        lastKeyRef.current = null
      }

      // ── Plain single-key shortcuts ─────────────────────────────────────
      // Only when no modifier keys are held (except Shift for '?')
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey
      if (!hasModifier) {
        // Start 'g' sequence
        if (plainKey === 'g') {
          e.preventDefault()
          lastKeyRef.current = 'g'
          clearSequenceTimer()
          sequenceTimerRef.current = setTimeout(() => {
            lastKeyRef.current = null
            sequenceTimerRef.current = null
          }, 1000)
          return
        }

        // Single-key non-sequence shortcuts
        for (const shortcut of shortcuts) {
          if (
            !shortcut.isSequence &&
            shortcut.keys.length === 1 &&
            shortcut.keys[0].toLowerCase() === plainKey
          ) {
            e.preventDefault()
            shortcut.action()
            return
          }
        }
      }
    },
    [enabled, shortcuts, clearSequenceTimer]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearSequenceTimer()
    }
  }, [handleKeyDown, clearSequenceTimer])

  return { shortcuts }
}
