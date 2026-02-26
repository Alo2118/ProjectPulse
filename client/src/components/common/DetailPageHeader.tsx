/**
 * DetailPageHeader - Page header with back button, title, and actions
 * @module components/common/DetailPageHeader
 */

import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface DetailPageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  backTo?: string
  children?: ReactNode
  className?: string
}

export function DetailPageHeader({
  title,
  subtitle,
  onBack,
  backTo,
  children,
  className = '',
}: DetailPageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={handleBack}
        className="btn-icon"
        aria-label="Torna indietro"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="page-subtitle text-sm mt-0.5">{subtitle}</p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
