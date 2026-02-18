/**
 * useFocusTrap - Traps keyboard focus within a container while active
 * Implements ARIA focus management pattern for modals/dialogs
 * @module hooks/useFocusTrap
 */

import { useEffect, useRef, useCallback } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ')

/**
 * Traps focus within `ref` container when `isActive` is true.
 * Restores focus to the previously focused element on deactivation.
 *
 * @param isActive - Whether the trap is active
 * @returns ref to attach to the container element
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<Element | null>(null)

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'))
  }, [])

  // Trap tab/shift+tab within container
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = getFocusableElements()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [getFocusableElements]
  )

  useEffect(() => {
    if (!isActive) return

    // Save currently focused element
    previouslyFocusedRef.current = document.activeElement

    // Focus first focusable element inside container
    const focusable = getFocusableElements()
    if (focusable.length > 0) {
      // Small delay to allow CSS transitions to settle
      const timer = setTimeout(() => focusable[0].focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isActive, getFocusableElements])

  useEffect(() => {
    if (!isActive) {
      // Restore focus on deactivation
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus()
      }
      return
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleKeyDown])

  return containerRef
}
