import { MessageSquare, AtSign, UserPlus, AlertTriangle, FileText, Lightbulb, CheckCircle, XCircle, ArrowRightLeft, ShieldAlert, UserCheck, FileCheck, Zap, CalendarClock } from 'lucide-react'
import type { Notification, NotificationType } from '@/types'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (notification: Notification) => void
}

const iconMap: Record<NotificationType, React.ElementType> = {
  new_comment: MessageSquare,
  mention: AtSign,
  task_assigned: UserPlus,
  task_blocked: XCircle,
  task_status_changed: ArrowRightLeft,
  approval_requested: CheckCircle,
  risk_critical: AlertTriangle,
  risk_high: ShieldAlert,
  risk_assigned: UserCheck,
  document_review: FileText,
  document_approved: FileCheck,
  input_received: Lightbulb,
  input_processed: CheckCircle,
  input_converted: Lightbulb,
  input_mention: AtSign,
  task_blocked_mention: AtSign,
  note_mention: AtSign,
  automation: Zap,
  weekly_report_reminder: CalendarClock,
}

const colorMap: Record<NotificationType, string> = {
  new_comment: 'text-blue-500',
  mention: 'text-violet-500',
  task_assigned: 'text-green-500',
  task_blocked: 'text-red-500',
  task_status_changed: 'text-indigo-500',
  approval_requested: 'text-amber-500',
  risk_critical: 'text-red-600',
  risk_high: 'text-red-500',
  risk_assigned: 'text-orange-500',
  document_review: 'text-purple-500',
  document_approved: 'text-green-600',
  input_received: 'text-cyan-500',
  input_processed: 'text-green-500',
  input_converted: 'text-emerald-500',
  input_mention: 'text-cyan-500',
  task_blocked_mention: 'text-orange-500',
  note_mention: 'text-yellow-600',
  automation: 'text-amber-500',
  weekly_report_reminder: 'text-blue-600',
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'ora'
  if (minutes < 60) return `${minutes}m fa`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}g fa`
  return new Date(dateStr).toLocaleDateString('it-IT')
}

export default function NotificationItem({ notification, onMarkAsRead, onDelete, onClick }: NotificationItemProps) {
  const Icon = iconMap[notification.type] || MessageSquare
  const iconColor = colorMap[notification.type] || 'text-gray-500'

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    onClick?.(notification)
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
        notification.isRead
          ? 'bg-white dark:bg-surface-800'
          : 'bg-blue-50/50 dark:bg-blue-900/10'
      } hover:bg-gray-50 dark:hover:bg-surface-700`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(notification.id)
        }}
        className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        title="Elimina"
      >
        <XCircle className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
