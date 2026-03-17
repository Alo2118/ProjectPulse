import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Columns,
  GanttChart,
  AlertTriangle,
  FileText,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
} from 'lucide-react'
import { cn, getUserInitials, getAvatarColor } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { usePrivilegedRole } from '@/hooks/ui/usePrivilegedRole'
import { useLogout } from '@/hooks/api/useAuth'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarNavItem } from './SidebarNavItem'
import { NAV_DOMAIN_COLORS, ROLE_LABELS, ROLE_COLORS } from '@/lib/constants'

interface NavItemDef {
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  domainKey: string
  badge?: number
}

const WORKSPACE_ITEMS: NavItemDef[] = [
  { href: '/',                  icon: LayoutDashboard, label: 'Dashboard',  domainKey: 'dashboard' },
  { href: '/projects',          icon: FolderKanban,    label: 'Progetti',   domainKey: 'projects'  },
  { href: '/tasks',             icon: CheckSquare,     label: 'Task',       domainKey: 'tasks'     },
  { href: '/tasks?view=kanban', icon: Columns,         label: 'Kanban',     domainKey: 'kanban'    },
  { href: '/tasks?view=gantt',  icon: GanttChart,      label: 'Gantt',      domainKey: 'gantt'     },
]

const GESTIONE_ITEMS: NavItemDef[] = [
  { href: '/risks',     icon: AlertTriangle, label: 'Rischi',    domainKey: 'risks'     },
  { href: '/documents', icon: FileText,      label: 'Documenti', domainKey: 'documents' },
  { href: '/reports',   icon: BarChart3,     label: 'Report',    domainKey: 'reports'   },
]

function NavSection({
  label,
  items,
  collapsed,
  style,
}: {
  label: string
  items: NavItemDef[]
  collapsed: boolean
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        padding: '0 10px',
        marginBottom: '6px',
        ...style,
      }}
    >
      {!collapsed && (
        <div
          style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            color: 'var(--text-muted)',
            padding: '0 8px',
            marginBottom: '3px',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      )}
      {items.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          icon={item.icon as import('lucide-react').LucideIcon}
          label={item.label}
          domainColor={NAV_DOMAIN_COLORS[item.domainKey]}
          badge={item.badge}
          collapsed={collapsed}
        />
      ))}
    </div>
  )
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar)
  const { user, isPrivileged } = usePrivilegedRole()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => logoutMutation.mutate()

  const gestioneItems = isPrivileged ? GESTIONE_ITEMS : GESTIONE_ITEMS.filter(
    (i) => i.domainKey !== 'risks' && i.domainKey !== 'documents'
  )

  const roleColor = user ? (ROLE_COLORS[user.role] ?? ROLE_COLORS['guest']) : undefined

  const sidebarContent = (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '0 18px 20px' : '0 18px 20px',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '14px',
        }}
      >
        {/* Mobile close button */}
        <div className="flex items-center md:hidden justify-end pt-4 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-muted)]"
            onClick={() => setMobileSidebar(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {collapsed ? (
          <div
            className="flex justify-center items-center pt-4 pb-1"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: '16px',
              color: 'var(--accent-hex)',
            }}
          >
            PP
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: '16px',
                color: 'var(--text-primary)',
                paddingTop: '20px',
              }}
            >
              Project<span style={{ color: 'var(--accent-hex)' }}>Pulse</span>
            </div>
            <div
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                marginTop: '1px',
                fontWeight: 500,
              }}
            >
              Ufficio Tecnico
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <TooltipProvider>
          <NavSection label="Workspace" items={WORKSPACE_ITEMS} collapsed={collapsed} />
          {gestioneItems.length > 0 && (
            <NavSection
              label="Gestione"
              items={gestioneItems}
              collapsed={collapsed}
              style={{ marginTop: collapsed ? '6px' : '6px' }}
            />
          )}
        </TooltipProvider>
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div
        style={{
          marginTop: 'auto',
          padding: '14px 10px 0',
          borderTop: '1px solid var(--border-default)',
        }}
      >
        {/* User section */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 9px',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
            className={cn(collapsed && 'justify-center')}
            onClick={() => {
              navigate('/profile')
              setMobileSidebar(false)
            }}
          >
            {/* Avatar */}
            <div
              className={cn(
                'inline-flex items-center justify-center shrink-0 rounded-full text-white',
                getAvatarColor(`${user.firstName} ${user.lastName}`)
              )}
              style={{
                width: '28px',
                height: '28px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                border: '1px solid var(--border-default)',
              }}
            >
              {getUserInitials(user.firstName, user.lastName)}
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div
                  style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}
                  className="truncate"
                >
                  {user.firstName[0]}. {user.lastName}
                </div>
                {roleColor && (
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginTop: '1px',
                      display: 'inline-block',
                      background: roleColor.bg,
                      color: roleColor.text,
                      border: `1px solid ${roleColor.border}`,
                    }}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle (desktop only) + logout */}
        <div
          className={cn(
            'flex items-center hidden md:flex pb-3 pt-1',
            collapsed ? 'flex-col gap-1' : 'gap-1 justify-between'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={toggleSidebar}
            title={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--text-muted)] hover:text-red-400"
              onClick={handleLogout}
              title="Esci"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden md:flex flex-col transition-[width] duration-200 ease-in-out',
          collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
        )}
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
        }}
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
          <aside
            className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden"
            style={{
              width: 'var(--sidebar-width)',
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border-default)',
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
