import { cn, getAvatarColor, getUserInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface AvatarUser {
  id: string
  name: string
}

interface AvatarStackProps {
  users: AvatarUser[]
  max?: number
  size?: 'sm' | 'md'
  className?: string
}

export function AvatarStack({
  users,
  max = 3,
  size = 'sm',
  className,
}: AvatarStackProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, i) => (
        <Avatar
          key={user.id}
          className={cn(
            'border-2 border-background',
            size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]',
            i > 0 && '-ml-2'
          )}
        >
          <AvatarFallback
            className="font-heading font-bold"
            style={{ backgroundColor: getAvatarColor(user.name) }}
          >
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            '-ml-2 flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground',
            size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]',
            'font-medium'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
