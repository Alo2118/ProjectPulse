import {
  Bell,
  CheckSquare,
  MessageSquare,
  AlertTriangle,
  FileText,
  FolderKanban,
  Zap,
  Clock,
} from "lucide-react"
import { cn, formatRelative } from "@/lib/utils"

interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: Record<string, unknown>
}

interface NotificationItemProps {
  notification: NotificationData
  onRead: (id: string) => void
  onNavigate: (notification: NotificationData) => void
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  task_assigned: CheckSquare,
  task_status_changed: CheckSquare,
  task_due_soon: Clock,
  task_overdue: Clock,
  comment_added: MessageSquare,
  comment_mention: MessageSquare,
  risk_high: AlertTriangle,
  risk_assigned: AlertTriangle,
  document_approved: FileText,
  document_review: FileText,
  project_update: FolderKanban,
  automation: Zap,
}

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? Bell
}

export function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: NotificationItemProps) {
  const Icon = getIcon(notification.type)

  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id)
    }
    onNavigate(notification)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
        !notification.isRead && "bg-accent/50"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Icon
          className={cn(
            "h-4 w-4",
            notification.isRead ? "text-muted-foreground" : "text-primary"
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            notification.isRead ? "font-normal" : "font-semibold"
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatRelative(notification.createdAt)}
        </p>
      </div>

      {!notification.isRead && (
        <div className="mt-2 flex-shrink-0">
          <span className="block h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  )
}

export type { NotificationData }
