import { cn, getUserInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export interface ActivityItem {
  id: string
  type: 'comment' | 'system'
  userName?: string
  action: string
  target?: string
  content?: string
  time: string
  dotColor?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  maxItems?: number
  className?: string
}

export function ActivityFeed({ items, maxItems, className }: ActivityFeedProps) {
  const visible = maxItems ? items.slice(0, maxItems) : items

  return (
    <div className={cn('space-y-3', className)}>
      {visible.map((item) => (
        <div key={item.id} className="flex gap-3">
          {item.type === 'comment' && item.userName ? (
            <Avatar className="h-7 w-7 shrink-0 text-[10px]">
              <AvatarFallback
                className="font-heading font-bold"
                style={{ backgroundColor: getAvatarColor(item.userName) }}
              >
                {getUserInitials(item.userName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              <div className={cn('h-2 w-2 rounded-full', item.dotColor ?? 'bg-primary')} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs">
              {item.userName && <span className="font-semibold">{item.userName}</span>}{' '}
              <span className="text-muted-foreground">{item.action}</span>
              {item.target && <span className="font-medium"> {item.target}</span>}
              <span className="ml-2 text-[10px] text-muted-foreground">{item.time}</span>
            </div>
            {item.content && (
              <div className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {item.content}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
