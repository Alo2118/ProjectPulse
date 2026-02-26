import { useState, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { useNotificationStore } from '@stores/notificationStore'
import { useSearchStore } from '@stores/searchStore'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  MessageSquarePlus,
  CalendarDays,
  ClipboardList,
  Shield,
  LayoutTemplate,
  Building2,
  Settings2,
  FileDown,
  GitBranch,
  Zap,
  BrainCircuit,
  UserCog,
  Bell,
  Sun,
  X,
  ChevronRight,
  Search,
  LogOut,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
  roles: string[]
}

interface NavGroup {
  key: string
  label: string
  collapsible: boolean
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    key: 'primary',
    label: '',
    collapsible: false,
    items: [
      { name: 'La Mia Giornata', href: '/my-day', icon: Sun, roles: ['admin', 'direzione', 'dipendente'] },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'direzione', 'dipendente', 'guest'] },
      { name: 'Progetti', href: '/projects', icon: FolderKanban, roles: ['admin', 'direzione', 'dipendente', 'guest'] },
      { name: 'Task', href: '/tasks', icon: CheckSquare, roles: ['admin', 'direzione', 'dipendente', 'guest'] },
      { name: 'Calendario', href: '/calendar', icon: CalendarDays, roles: ['admin', 'direzione', 'dipendente', 'guest'] },
      { name: 'Tempo', href: '/time-tracking', icon: Clock, roles: ['admin', 'direzione', 'dipendente'] },
    ],
  },
  {
    key: 'gestione',
    label: 'Gestione',
    collapsible: true,
    items: [
      { name: 'Segnalazioni', href: '/inputs', icon: MessageSquarePlus, roles: ['admin', 'direzione', 'dipendente'] },
      { name: 'Rischi', href: '/risks', icon: AlertTriangle, roles: ['admin', 'direzione'] },
      { name: 'Documenti', href: '/documents', icon: FileText, roles: ['admin', 'direzione'] },
    ],
  },
  {
    key: 'analisi',
    label: 'Analisi',
    collapsible: true,
    items: [
      { name: 'Pianificazione', href: '/planning', icon: BrainCircuit, roles: ['admin', 'direzione'] },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'direzione'] },
      { name: 'Report Settimanale', href: '/reports/weekly', icon: ClipboardList, roles: ['admin', 'direzione', 'dipendente'] },
    ],
  },
  {
    key: 'admin',
    label: 'Amministrazione',
    collapsible: true,
    items: [
      { name: 'Utenti', href: '/users', icon: UserCog, roles: ['admin'] },
      { name: 'Reparti', href: '/admin/departments', icon: Building2, roles: ['admin'] },
      { name: 'Template', href: '/admin/templates', icon: LayoutTemplate, roles: ['admin'] },
      { name: 'Campi Custom', href: '/admin/custom-fields', icon: Settings2, roles: ['admin', 'direzione'] },
      { name: 'Import / Export', href: '/admin/import', icon: FileDown, roles: ['admin', 'direzione'] },
      { name: 'Workflow', href: '/admin/workflows', icon: GitBranch, roles: ['admin'] },
      { name: 'Automazioni', href: '/admin/automations', icon: Zap, roles: ['admin', 'direzione'] },
      { name: 'Registro Audit', href: '/audit', icon: Shield, roles: ['admin', 'direzione'] },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const userRole = user?.role || 'dipendente'
  const { mobileSidebarOpen, setMobileSidebarOpen } = useDashboardStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const openSearch = useSearchStore((s) => s.open)

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebar-collapsed') || '{}')
    } catch {
      return {}
    }
  })

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [group]: !prev[group] }
      localStorage.setItem('sidebar-collapsed', JSON.stringify(next))
      return next
    })
  }, [])

  const closeMobile = () => setMobileSidebarOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    closeMobile()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-5 border-b sidebar-border">
        <span className="sidebar-logo">ProjectPulse</span>
        <button
          onClick={closeMobile}
          className="lg:hidden btn-icon"
          aria-label="Chiudi sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <button
          onClick={() => { openSearch(); closeMobile() }}
          className="sidebar-search"
        >
          <Search className="w-4 h-4" />
          <span className="text-xs">Cerca...</span>
          <kbd className="ml-auto hidden sm:inline-flex text-[10px] rounded px-1 py-0.5" style={{ color: 'var(--text-tertiary)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border-default)' }}>
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole)
          )
          if (visibleItems.length === 0) return null

          const isCollapsed = group.collapsible && collapsedGroups[group.key]

          return (
            <div key={group.key} className="mb-1">
              {group.collapsible && group.label && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center justify-between w-full px-3 pt-4 pb-1 group"
                >
                  <span className="nav-group-label">
                    {group.label}
                  </span>
                  <ChevronRight
                    className={`nav-group-chevron ${
                      !isCollapsed ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `nav-item ${isActive ? 'nav-item-active' : ''}`
                      }
                    >
                      <item.icon className="w-4.5 h-4.5 mr-3 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-2 border-t sidebar-border space-y-0.5">
        {/* Notifications */}
        <NavLink
          to="/notifications"
          onClick={closeMobile}
          className={({ isActive }) =>
            `nav-item ${isActive ? 'nav-item-active' : ''}`
          }
        >
          <Bell className="w-4.5 h-4.5 mr-3 flex-shrink-0" />
          <span>Notifiche</span>
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* User info */}
        <div className="flex items-center gap-2 mt-2 px-2 py-2">
          <button
            onClick={() => { navigate('/profile'); closeMobile() }}
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg p-1 -m-1 hover:bg-cyan-500/5 transition-colors"
            title="Modifica profilo"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center ring-2 ring-cyan-500/20 flex-shrink-0">
              <span className="text-xs font-medium text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>
                {user?.role}
              </p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-themed-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 flex-shrink-0"
            aria-label="Esci"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 sidebar hidden lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 sidebar lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
