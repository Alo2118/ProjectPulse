import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarNavItemProps {
  href: string
  icon: LucideIcon
  label: string
  isActive?: boolean
  domainColor?: { bg: string; text: string; border: string }
  badge?: number
  collapsed?: boolean
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  isActive: isActiveProp,
  domainColor,
  badge,
  collapsed,
}: SidebarNavItemProps) {
  const { pathname } = useLocation()

  const isActive =
    isActiveProp !== undefined
      ? isActiveProp
      : href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(href + '/')

  const activeStyle = isActive && domainColor
    ? {
        background: domainColor.bg,
        color: domainColor.text,
        borderColor: domainColor.border,
      }
    : undefined

  const content = (
    <Link
      to={href}
      style={activeStyle}
      className={cn(
        'nav-item flex items-center gap-[9px] px-[9px] py-[7px] mb-[1px]',
        'rounded-[var(--radius-sm)] text-[13px] font-medium border border-transparent',
        'transition-all duration-150 text-[var(--text-secondary)] no-underline',
        !isActive && 'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
        isActive && !domainColor && 'bg-[rgba(45,140,240,0.08)] text-[#60a5fa] border-[rgba(45,140,240,0.2)]',
        collapsed && 'justify-center gap-0 px-0 w-10 h-10 mx-auto'
      )}
    >
      <Icon
        className={cn(
          'shrink-0',
          isActive ? 'opacity-100' : 'opacity-70'
        )}
        style={{ width: '15px', height: '15px' }}
      />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span
              className="flex items-center justify-center rounded-[3px] px-[5px] py-[1px] text-[9px] font-bold"
              style={{
                background: 'rgba(59,130,246,0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.2)',
                minWidth: '16px',
              }}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{
            background: '#3b82f6',
            color: '#fff',
            minWidth: '16px',
            height: '16px',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative flex justify-center">{content}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
