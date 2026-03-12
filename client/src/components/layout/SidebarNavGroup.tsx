import { useState, useCallback, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarNavGroupProps {
  label: string
  children: ReactNode
  collapsed?: boolean
  defaultOpen?: boolean
}

function getStorageKey(label: string) {
  return `pp-nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`
}

function getInitialOpen(label: string, defaultOpen: boolean): boolean {
  try {
    const stored = localStorage.getItem(getStorageKey(label))
    if (stored !== null) return stored === 'true'
  } catch {
    // localStorage not available
  }
  return defaultOpen
}

export function SidebarNavGroup({
  label,
  children,
  collapsed,
  defaultOpen = true,
}: SidebarNavGroupProps) {
  const [open, setOpen] = useState(() => getInitialOpen(label, defaultOpen))

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(getStorageKey(label), String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [label])

  // When sidebar is collapsed, just show children without group wrapper
  if (collapsed) {
    return <div className="space-y-0.5">{children}</div>
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
        <span>{label}</span>
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}
