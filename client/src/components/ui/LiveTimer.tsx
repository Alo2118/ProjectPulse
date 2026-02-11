/**
 * LiveTimer - Real-time timer display component
 * Shows elapsed time in HH:MM:SS format, updating every second
 */

import { useState, useEffect } from 'react'

interface LiveTimerProps {
  startTime: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
}

export function LiveTimer({ startTime, className = '', size = 'md' }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }
    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  return (
    <span className={`font-mono font-bold ${sizeClasses[size]} ${className}`}>
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}
