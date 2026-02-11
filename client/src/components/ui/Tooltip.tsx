import { useState, useRef, type ReactNode } from 'react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const POSITION_CLASSES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const

const ARROW_CLASSES = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-800 dark:border-t-surface-200 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-800 dark:border-b-surface-200 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-800 dark:border-l-surface-200 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-800 dark:border-r-surface-200 border-y-transparent border-l-transparent',
} as const

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), 200)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${POSITION_CLASSES[position]} pointer-events-none animate-fade-in`}
        >
          <div className="bg-surface-800 dark:bg-surface-200 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg max-w-80">
            {content}
          </div>
          <div className={`absolute w-0 h-0 border-4 ${ARROW_CLASSES[position]}`} />
        </div>
      )}
    </div>
  )
}
