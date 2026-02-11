import { LogOut, Moon, Sun, Menu, Square } from 'lucide-react'
import { useAuthStore } from '@stores/authStore'
import { useThemeStore } from '@stores/themeStore'
import { useDashboardStore } from '@stores/dashboardStore'
import { Link, useNavigate } from 'react-router-dom'
import NotificationBell from '@/components/features/notifications/NotificationBell'
import { LiveTimer } from '@/components/ui/LiveTimer'

export default function Header() {
  const { logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { runningTimer, stopTimer } = useDashboardStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/70 dark:bg-surface-900/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
      <div className="flex items-center justify-between h-full px-6">
        {/* Mobile menu button */}
        <button className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100/60 dark:text-gray-400 dark:hover:bg-white/5 transition-all duration-150">
          <Menu className="w-6 h-6" />
        </button>

        {/* Running Timer Indicator */}
        {runningTimer && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <Link
              to="/time-tracking"
              className="text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 truncate max-w-32"
              title={runningTimer.task?.title}
            >
              {runningTimer.task?.title}
            </Link>
            <LiveTimer startTime={runningTimer.startTime} size="sm" className="text-primary-600 dark:text-primary-400" />
            <button
              onClick={() => stopTimer()}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
              title="Stop timer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <input
            type="search"
            placeholder="Cerca progetti, task..."
            className="input"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {/* Notifications */}
          <NotificationBell />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100/60 dark:text-gray-400 dark:hover:bg-white/5 transition-all duration-150"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
