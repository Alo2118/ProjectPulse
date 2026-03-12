import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarNavItemProps {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
  collapsed?: boolean
  /** Domain color name (e.g. 'blue', 'red') for context-aware active styling */
  contextColor?: string
}

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  badge,
  collapsed,
  contextColor,
}: SidebarNavItemProps) {
  const { pathname } = useLocation()

  const isActive =
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(href + '/')

  const content = (
    <Link
      to={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && contextColor
          ? `border-l-2 border-${contextColor}-500 bg-${contextColor}-100/10 dark:bg-${contextColor}-900/10 text-foreground`
          : isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
