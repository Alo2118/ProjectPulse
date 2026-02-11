/**
 * InfoCard - Reusable card wrapper for detail pages
 * @module components/common/InfoCard
 */

import { ReactNode } from 'react'

interface InfoCardProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export function InfoCard({ children, className = '', noPadding = false }: InfoCardProps) {
  return (
    <div className={`card ${noPadding ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  )
}
