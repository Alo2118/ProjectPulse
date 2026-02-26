/**
 * KeyboardShortcutsModal - Displays all available keyboard shortcuts grouped by category
 * @module components/features/KeyboardShortcutsModal
 */

import { ArrowRight, Keyboard, X } from 'lucide-react'
import { BaseModal } from '@components/ui/BaseModal'
import type { ShortcutDefinition } from '@hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: ShortcutDefinition[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Split a combo string such as "ctrl+k" into display tokens ["Ctrl", "K"].
 * Sequences such as ['g', 't'] render as ["G", "→", "T"].
 */
function parseShortcutDisplay(keys: string[], isSequence: boolean | undefined): string[][] {
  if (isSequence) {
    // Each key in the sequence is its own badge group separated by an arrow
    return keys.map((k) => [k.toUpperCase()])
  }

  // Multiple alternatives (e.g. ctrl+k / meta+k) — show the first relevant one
  const primary = keys[0]
  return [
    primary
      .split('+')
      .map((part) => {
        if (part === 'ctrl') return 'Ctrl'
        if (part === 'meta') return '⌘'
        if (part === 'shift') return 'Shift'
        if (part === 'alt') return 'Alt'
        return part.toUpperCase()
      }),
  ]
}

function KeyBadge({ label }: { label: string }) {
  return (
    <kbd
      className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700
                 border border-gray-300 dark:border-gray-600 rounded
                 text-xs font-mono font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
    </kbd>
  )
}

function ShortcutKeys({ keys, isSequence }: { keys: string[]; isSequence?: boolean }) {
  const groups = parseShortcutDisplay(keys, isSequence)

  if (isSequence) {
    return (
      <span className="flex items-center gap-1">
        {groups.map((group, groupIdx) => (
          <span key={groupIdx} className="flex items-center gap-1">
            {groupIdx > 0 && (
              <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-500" aria-hidden />
            )}
            {group.map((label, labelIdx) => (
              <KeyBadge key={labelIdx} label={label} />
            ))}
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1">
      {groups[0].map((label, idx) => (
        <span key={idx} className="flex items-center gap-0.5">
          {idx > 0 && <span className="text-gray-400 dark:text-gray-500 text-xs">+</span>}
          <KeyBadge label={label} />
        </span>
      ))}
    </span>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  // Group shortcuts by category
  const grouped = shortcuts.reduce<Record<string, ShortcutDefinition[]>>((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {})

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
    >
      {/* Custom scrollable content — the panel itself does not scroll, the inner div does */}
      <div className="flex flex-col max-h-[80vh]">
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl rounded-t-xl">
          <h2
            id="shortcuts-modal-title"
            className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white"
          >
            <Keyboard className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden />
            Scorciatoie da Tastiera
          </h2>
          <button
            onClick={onClose}
            aria-label="Chiudi scorciatoie"
            className="btn-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto">
          {Object.entries(grouped).map(([category, categoryShortcuts]) => (
            <section key={category} aria-labelledby={`category-${category}`}>
              <h3
                id={`category-${category}`}
                className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3"
              >
                {category}
              </h3>
              <ul className="space-y-2" role="list">
                {categoryShortcuts.map((shortcut) => (
                  <li
                    key={shortcut.label}
                    className="flex items-center justify-between gap-4 py-1.5"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.label}
                    </span>
                    <ShortcutKeys keys={shortcut.keys} isSequence={shortcut.isSequence} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 rounded-b-xl">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Premi <KeyBadge label="?" /> in qualsiasi momento per aprire questa finestra
          </p>
        </div>
      </div>
    </BaseModal>
  )
}
