import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageContext, type Domain } from '@/hooks/ui/usePageContext'
import {
  Home,
  FolderKanban,
  CheckSquare,
  Clock,
  MessageSquarePlus,
  AlertTriangle,
  FileText,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  UserCog,
  Building2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, getUserInitials, getAvatarColor } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import { useLogout } from '@/hooks/api/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarNavItem } from './SidebarNavItem'
import { SidebarNavGroup } from './SidebarNavGroup'
import { ROLE_LABELS } from '@/lib/constants'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
  domain?: Domain
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar)
  const { user, isPrivileged, isAdmin, isGuest } = usePrivilegedRole()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const pageContext = usePageContext()

  const primaryItems: NavItem[] = useMemo(
    () => [{ icon: Home, label: 'Home', href: '/', domain: 'home' }],
    []
  )

  const lavoroItems: NavItem[] = useMemo(
    () => [
      { icon: FolderKanban, label: 'Progetti', href: '/projects', domain: 'project' },
      { icon: CheckSquare, label: 'Task', href: '/tasks', domain: 'task' },
      { icon: Clock, label: 'Tempo', href: '/time-tracking', domain: 'time_entry' },
    ],
    []
  )

  const gestioneItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { icon: MessageSquarePlus, label: 'Segnalazioni', href: '/inputs', domain: 'input' },
    ]
    if (isPrivileged) {
      items.push(
        { icon: AlertTriangle, label: 'Rischi', href: '/risks', domain: 'risk' },
        { icon: FileText, label: 'Documenti', href: '/documents', domain: 'document' }
      )
    }
    return items
  }, [isPrivileged])

  const analisiItems: NavItem[] = useMemo(
    () => [
      { icon: BarChart3, label: 'Analytics', href: '/analytics', domain: 'analytics' },
      { icon: BrainCircuit, label: 'Pianificazione', href: '/planning', domain: 'analytics' },
      { icon: ClipboardList, label: 'Report', href: '/reports', domain: 'analytics' },
    ],
    []
  )

  const adminItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = []
    if (isAdmin) {
      items.push(
        { icon: UserCog, label: 'Utenti', href: '/admin/users', domain: 'admin' },
        { icon: Building2, label: 'Reparti', href: '/admin/departments', domain: 'admin' }
      )
    }
    if (isPrivileged) {
      items.push({ icon: Settings, label: 'Configurazione', href: '/admin/config', domain: 'admin' })
    }
    return items
  }, [isAdmin, isPrivileged])

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
      const domainMatch = pageContext && item.domain && item.domain === pageContext.domain
      return (
        <SidebarNavItem
          key={item.href}
          icon={item.icon}
          label={item.label}
          href={item.href}
          badge={item.badge}
          collapsed={collapsed}
          contextColor={domainMatch ? pageContext.color : undefined}
        />
      )
    })

  const handleLogout = () => logoutMutation.mutate()

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card">
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-4 shrink-0',
          collapsed && 'justify-center px-2'
        )}
      >
        {collapsed ? (
          <span className="text-lg font-bold text-primary">PP</span>
        ) : (
          <span className="text-lg font-bold text-foreground">
            Project<span className="text-primary">Pulse</span>
          </span>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden h-8 w-8"
          onClick={() => setMobileSidebar(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <TooltipProvider>
          {/* Primary */}
          <div className="space-y-0.5">{renderNavItems(primaryItems)}</div>

          {/* Lavoro */}
          <SidebarNavGroup label="Lavoro" collapsed={collapsed}>
            {renderNavItems(lavoroItems)}
          </SidebarNavGroup>

          {/* Gestione (privileged + non-guest) */}
          {!isGuest && gestioneItems.length > 0 && (
            <SidebarNavGroup label="Gestione" collapsed={collapsed}>
              {renderNavItems(gestioneItems)}
            </SidebarNavGroup>
          )}

          {/* Analisi (privileged only) */}
          {isPrivileged && (
            <SidebarNavGroup label="Analisi" collapsed={collapsed}>
              {renderNavItems(analisiItems)}
            </SidebarNavGroup>
          )}

          {/* Admin */}
          {adminItems.length > 0 && (
            <SidebarNavGroup label="Admin" collapsed={collapsed}>
              {renderNavItems(adminItems)}
            </SidebarNavGroup>
          )}
        </TooltipProvider>
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-border p-2 space-y-2">
        {/* Collapse toggle (desktop only) */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'hidden md:flex w-full gap-2 text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center'
          )}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs">Comprimi</span>
            </>
          )}
        </Button>

        <Separator />

        {/* User card */}
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              collapsed && 'justify-center'
            )}
          >
            <button
              type="button"
              onClick={() => {
                navigate('/profile')
                setMobileSidebar(false)
              }}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
                getAvatarColor(`${user.firstName} ${user.lastName}`)
              )}
            >
              {getUserInitials(user.firstName, user.lastName)}
            </button>

            {!collapsed && (
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden md:flex flex-col border-r border-border transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileSidebar(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
