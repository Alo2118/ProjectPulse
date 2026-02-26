/**
 * BaseModal - Reusable modal foundation with portal, focus trap, Escape handling, and animations
 * @module components/ui/BaseModal
 */

import { useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useFocusTrap } from '@hooks/useFocusTrap'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface BaseModalProps {
  /** Controls whether the modal is rendered and visible */
  isOpen: boolean
  /** Called when the modal should close (overlay click, Escape key, close button) */
  onClose: () => void
  /** Optional title rendered in a header bar above children */
  title?: ReactNode
  /** Controls max-width of the modal panel */
  size?: ModalSize
  children: ReactNode
  /** Additional class names merged onto the modal panel */
  className?: string
  /** Show the X close button in the header (default: true) */
  showCloseButton?: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BaseModal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  className = '',
  showCloseButton = true,
}: BaseModalProps) {
  const trapRef = useFocusTrap(isOpen)

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-hidden={!isOpen}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'base-modal-title' : undefined}
            className={[
              'relative w-full',
              SIZE_CLASSES[size],
              'modal-panel',
              'overflow-hidden',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — rendered only when title or close button is present */}
            {(title !== undefined || showCloseButton) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-cyan-500/15">
                {title !== undefined ? (
                  <h2
                    id="base-modal-title"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {title}
                  </h2>
                ) : (
                  // Spacer so the X button stays right-aligned when there is no title
                  <span />
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Chiudi"
                    className="btn-icon ml-4 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
