import { cn, getAvatarColor } from '@/lib/utils'
import { Avatar } from '@/components/common/Avatar'

interface AvatarUser {
  id?: string
  name: string
}

interface AvatarStackProps {
  users: AvatarUser[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function AvatarStack({ users, max = 5, size = 'sm', className }: AvatarStackProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  // Size values for the overflow badge
  const overflowSizeClass =
    size === 'xs' ? 'w-[18px] h-[18px] text-[8px]' :
    size === 'sm' ? 'w-[20px] h-[20px] text-[9px]' :
    'w-[28px] h-[28px] text-[10px]'

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, i) => (
        <Avatar
          key={user.id ?? user.name}
          name={user.name}
          size={size}
          colorClass={getAvatarColor(user.name)}
          className={cn(
            'border-2 border-[hsl(var(--bg-surface,var(--card)))]',
            i > 0 && '-ml-2',
          )}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full flex-shrink-0',
            'border-2 border-[hsl(var(--bg-surface,var(--card)))]',
            'bg-muted text-muted-foreground font-medium',
            '-ml-2',
            overflowSizeClass,
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
