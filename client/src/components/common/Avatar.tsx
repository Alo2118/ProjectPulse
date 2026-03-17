import { cn, getAvatarColor, getUserInitials } from '@/lib/utils'

export interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md'  // 18px | 20px | 28px
  colorClass?: string          // override Tailwind bg class
  className?: string
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/)
  return [parts[0] ?? '', parts.slice(1).join(' ') || '']
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-[18px] h-[18px] text-[8px]',
  sm: 'w-[20px] h-[20px] text-[9px]',
  md: 'w-[28px] h-[28px] text-[10px]',
}

export function Avatar({ name, size = 'md', colorClass, className }: AvatarProps) {
  const initials = getUserInitials(...splitName(name))
  const bgClass = colorClass ?? getAvatarColor(name)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full flex-shrink-0',
        'font-bold border border-border text-white',
        'font-heading', // maps to Syne via Tailwind config
        SIZE_CLASSES[size],
        bgClass,
        className,
      )}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  )
}
