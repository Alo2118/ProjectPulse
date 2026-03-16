import { cn, getAvatarColor, getUserInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface AvatarUser {
  id: string
  name: string // "FirstName LastName"
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ') || '']
}

interface AvatarStackProps {
  users: AvatarUser[]
  max?: number
  size?: 'sm' | 'md'
  className?: string
}

export function AvatarStack({
  users,
  max = 5,
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
            size === 'sm' ? 'h-[22px] w-[22px] text-[8px]' : 'h-7 w-7 text-[10px]',
            i > 0 && '-ml-[7px]'
          )}
        >
          <AvatarFallback
            className="font-heading font-bold"
            style={{ backgroundColor: getAvatarColor(user.name) }}
          >
            {getUserInitials(...splitName(user.name))}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground font-medium',
            size === 'sm' ? '-ml-[7px] h-[22px] w-[22px] text-[8px]' : '-ml-2 h-7 w-7 text-[10px]'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
