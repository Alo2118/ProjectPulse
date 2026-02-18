import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-12'} ${className}`}>
      <div className={`mx-auto mb-3 rounded-full bg-gray-100 dark:bg-surface-800 flex items-center justify-center ${
        compact ? 'w-12 h-12' : 'w-20 h-20'
      }`}>
        <Icon className={`text-gray-400 dark:text-gray-500 ${compact ? 'w-6 h-6' : 'w-10 h-10'}`} />
      </div>
      <h3 className={`font-medium text-gray-900 dark:text-white ${compact ? 'text-sm mb-1' : 'text-lg mb-2'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-gray-500 dark:text-gray-400 max-w-sm mx-auto ${compact ? 'text-xs' : 'text-sm mb-4'}`}>
          {description}
        </p>
      )}
      {action && !compact && (
        <button onClick={action.onClick} className="btn-primary mt-4">
          {action.label}
        </button>
      )}
    </div>
  )
}
