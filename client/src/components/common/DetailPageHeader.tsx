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
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Torna indietro"
      >
        <ArrowLeft className="w-5 h-5 text-gray-500" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
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
