/**
 * GanttTooltip - Portal-based tooltip for Gantt chart bars
 * Uses fixed positioning to avoid overflow clipping issues
 */

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface GanttTooltipProps {
  content: ReactNode
  children: ReactNode
}

export function GanttTooltip({ content, children }: GanttTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    // Use firstElementChild because the container has display:contents
    // which makes getBoundingClientRect() return a zero-sized rect
    const el = containerRef.current?.firstElementChild as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    updatePosition()
    timeoutRef.current = setTimeout(() => setIsVisible(true), 150)
  }, [updatePosition])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }, [])

  const handleMouseMove = useCallback(() => {
    if (isVisible) {
      updatePosition()
    }
  }, [isVisible, updatePosition])

  return (
    <>
      <div
        ref={containerRef}
        className="contents"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] animate-fade-in"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-xl dark:bg-slate-700">
              {content}
            </div>
            {/* Arrow pointing down */}
            <div
              className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-b-transparent border-l-transparent border-r-transparent border-t-slate-800 dark:border-t-slate-700"
            />
          </div>,
          document.body
        )}
    </>
  )
}
