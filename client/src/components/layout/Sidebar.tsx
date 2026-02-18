import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@stores/authStore'
import { useDashboardStore } from '@stores/dashboardStore'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  BarChart3,
  MessageSquarePlus,
  GanttChartSquare,
  ClipboardList,
  Shield,
  LayoutTemplate,
  X,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Progetti', href: '/projects', icon: FolderKanban, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Task', href: '/tasks', icon: CheckSquare, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Gantt', href: '/gantt', icon: GanttChartSquare, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Registra Tempo', href: '/time-tracking', icon: Clock, roles: ['admin', 'dipendente'] },
  { name: 'Tempo Team', href: '/team-time', icon: Users, roles: ['admin', 'direzione'] },
  { name: 'Approva Ore', href: '/time-approval', icon: CheckSquare, roles: ['admin', 'direzione'] },
  { name: 'Segnalazioni', href: '/inputs', icon: MessageSquarePlus, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Rischi', href: '/risks', icon: AlertTriangle, roles: ['admin', 'direzione'] },
  { name: 'Documenti', href: '/documents', icon: FileText, roles: ['admin', 'direzione'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'direzione'] },
  { name: 'Report Settimanale', href: '/reports/weekly', icon: ClipboardList, roles: ['admin', 'direzione', 'dipendente'] },
  { name: 'Utenti', href: '/users', icon: Users, roles: ['admin'] },
  { name: 'Registro Audit', href: '/audit', icon: Shield, roles: ['admin', 'direzione'] },
  { name: 'Template', href: '/admin/templates', icon: LayoutTemplate, roles: ['admin'] },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const userRole = user?.role || 'dipendente'
  const { mobileSidebarOpen, setMobileSidebarOpen } = useDashboardStore()

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  )

  const closeMobile = () => setMobileSidebarOpen(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/30 dark:border-white/5">
        <span className="text-xl font-bold text-gradient">ProjectPulse</span>
        <button
          onClick={closeMobile}
          className="lg:hidden btn-icon"
          aria-label="Chiudi sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={closeMobile}
            className={({ isActive }) =>
              `relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100/60 dark:text-gray-400 dark:hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary-500 rounded-full" />
                )}
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200/30 dark:border-white/5">
        <button
          onClick={() => { navigate('/profile'); closeMobile() }}
          className="flex items-center w-full rounded-lg p-1 -m-1 hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors"
          title="Modifica profilo"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center ring-2 ring-primary-500/20">
            <span className="text-sm font-medium text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="ml-3 text-left">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user?.role}
            </p>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white/70 dark:bg-surface-900/90 backdrop-blur-xl border-r border-white/20 dark:border-white/5 hidden lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-900 backdrop-blur-xl border-r border-white/20 dark:border-white/5 lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
