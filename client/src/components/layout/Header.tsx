import { useMemo } from 'react'
import { Moon, Sun, Menu, Square } from 'lucide-react'
import { useThemeStore } from '@stores/themeStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { Link, useLocation } from 'react-router-dom'
import { LiveTimer } from '@/components/ui/LiveTimer'

const pathLabels: Record<string, string> = {
  'projects': 'Progetti',
  'tasks': 'Task',
  'time-tracking': 'Registra Tempo',
  'team-time': 'Tempo Team',
  'kanban': 'Kanban',
  'gantt': 'Gantt',
  'calendar': 'Calendario',
  'risks': 'Rischi',
  'documents': 'Documenti',
  'inputs': 'Segnalazioni',
  'planning': 'Pianificazione',
  'analytics': 'Analytics',
  'reports': 'Report',
  'weekly': 'Settimanale',
  'notifications': 'Notifiche',
  'users': 'Utenti',
  'admin': 'Amministrazione',
  'departments': 'Reparti',
  'templates': 'Template',
  'custom-fields': 'Campi Custom',
  'import': 'Import / Export',
  'workflows': 'Workflow',
  'automations': 'Automazioni',
  'audit': 'Registro Audit',
  'profile': 'Profilo',
  'my-day': 'La Mia Giornata',
  'dashboard': 'Dashboard',
  'new': 'Nuovo',
  'edit': 'Modifica',
}

export default function Header() {
  const { theme, setTheme } = useThemeStore()
  const { runningTimer, stopTimer, mobileSidebarOpen, setMobileSidebarOpen } = useDashboardStore()
  const location = useLocation()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const crumbs: { label: string; path: string }[] = []
    let currentPath = ''

    for (const segment of segments) {
      currentPath += `/${segment}`
      const label = pathLabels[segment]
      if (label) {
        crumbs.push({ label, path: currentPath })
      }
      // Skip numeric IDs in breadcrumb display
    }

    return crumbs
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-40 h-14 header-bar">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden btn-icon flex-shrink-0"
            aria-label="Apri menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1 animate-breadcrumb-slide">
                {i > 0 && (
                  <span className="text-cyan-500/30 mx-1">/</span>
                )}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-slate-200 font-medium truncate">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="text-slate-500 hover:text-cyan-400 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Center: Running timer */}
        {runningTimer && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
            <Link
              to="/time-tracking"
              className="text-xs font-medium text-red-400 hover:text-red-300 truncate max-w-32"
              title={runningTimer.task?.title}
            >
              {runningTimer.task?.title}
            </Link>
            <LiveTimer startTime={runningTimer.startTime} size="sm" className="text-red-400 font-mono text-xs" />
            <button
              onClick={() => stopTimer()}
              className="p-0.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="Stop timer"
              aria-label="Ferma timer"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Right: Theme toggle */}
        <div className="flex items-center">
          <button
            onClick={toggleTheme}
            className="btn-icon"
            aria-label={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5" />
            ) : (
              <Moon className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
