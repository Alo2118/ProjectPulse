import { useCallback, useEffect, useRef, useState } from "react"

interface UseListKeyboardNavOptions<T> {
  items: T[]
  getId?: (item: T) => string
  onSelect?: (item: T) => void
  enabled?: boolean
}

interface UseListKeyboardNavResult {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
}

export function useListKeyboardNav<T>({
  items,
  onSelect,
  enabled = true,
}: UseListKeyboardNavOptions<T>): UseListKeyboardNavResult {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Use refs to avoid stale closures in the keydown handler
  const focusedIndexRef = useRef(focusedIndex)
  focusedIndexRef.current = focusedIndex
  const itemsRef = useRef(items)
  itemsRef.current = items
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || itemsRef.current.length === 0) return

      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      ) {
        return
      }

      const len = itemsRef.current.length

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1 >= len ? 0 : prev + 1))
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 < 0 ? len - 1 : prev - 1))
      } else if (e.key === "Enter" && focusedIndexRef.current >= 0 && focusedIndexRef.current < len) {
        e.preventDefault()
        onSelectRef.current?.(itemsRef.current[focusedIndexRef.current])
      }
    },
    [enabled]
  )

  useEffect(() => {
    if (!enabled) return
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])

  useEffect(() => {
    setFocusedIndex(-1)
  }, [items.length])

  return { focusedIndex, setFocusedIndex }
}
