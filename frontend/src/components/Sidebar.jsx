import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { usePendingRequestsCount } from '../hooks/usePendingRequestsCount';
import {
  LogOut,
  User,
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Users,
  Clock,
  Inbox,
  FileText,
  Menu,
  X,
  ChevronDown,
  Home,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const { pendingCount, refetchCount } = usePendingRequestsCount();

  useEffect(() => {
    // Initial fetch
    refetchCount();
    // Fallback: refresh every 120 seconds for sync across sessions
    const interval = setInterval(refetchCount, 120000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const menuItems = [
    {
      group: 'Navigation',
      items: [
        { to: '/', icon: Home, label: 'Dashboard', condition: true },
        { to: '/projects', icon: FolderKanban, label: 'Progetti', condition: true },
        { to: '/inbox', icon: Inbox, label: 'Inbox', condition: true },
      ],
    },
    {
      group: 'Gestione',
      items: [
        { to: '/calendar', icon: Calendar, label: 'Calendario', condition: true },
        { to: '/gantt', icon: FileText, label: 'Gantt', condition: true },
        {
          to: '/time-tracking',
          icon: Clock,
          label: 'Tempo',
          condition: user?.role !== 'direzione',
        },
        {
          to: '/templates',
          icon: FileText,
          label: 'Template',
          condition: user?.role !== 'direzione',
        },
        { to: '/reports', icon: BarChart3, label: 'Report', condition: true },
      ],
    },
    {
      group: 'Admin',
      items: [
        { to: '/users', icon: Users, label: 'Utenti', condition: user?.role === 'amministratore' },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.condition),
    }))
    .filter((group) => group.items.length > 0);

  const toggleMenu = (group) => {
    setExpandedMenu(expandedMenu === group ? null : group);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-primary-600 p-2 text-white shadow-lg transition-colors hover:bg-primary-700"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r-2 border-slate-200 dark:border-cyan-500/30 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 shadow-2xl shadow-slate-200/50 dark:shadow-cyan-500/20 backdrop-blur-lg transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0 -translate-x-full'
        } lg:w-64 lg:translate-x-0`}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-200 dark:border-cyan-500/20 p-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/50">
              PP
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">ProjectPulse</h1>
              <p className="text-xs text-blue-600 dark:text-cyan-400/70">v1.0</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6">
              <button
                onClick={() => toggleMenu(groupIdx)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-cyan-400/70 transition-colors hover:text-blue-800 dark:hover:text-cyan-300"
              >
                {group.group}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    expandedMenu === groupIdx ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`space-y-1 overflow-hidden transition-all ${
                  expandedMenu === groupIdx ? 'max-h-96' : 'max-h-96'
                }`}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  // Show badge for Inbox when there are pending requests
                  const showBadge = item.to === '/inbox' && pendingCount > 0;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-600 dark:text-cyan-300 shadow-lg shadow-cyan-500/20'
                          : 'border-transparent text-slate-600 dark:text-slate-300 hover:border-cyan-500/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                          {pendingCount}
                        </span>
                      )}
                      {active && !showBadge && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="space-y-3 border-t-2 border-slate-200 dark:border-cyan-500/20 p-4">
          <div className="flex items-center gap-3 rounded-lg border-2 border-blue-200 dark:border-cyan-500/30 bg-slate-100 dark:bg-slate-800/50 px-3 py-3 shadow-lg shadow-blue-200/50 dark:shadow-cyan-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-cyan-300">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs capitalize text-slate-600 dark:text-cyan-400/60">
                {user?.role === 'amministratore'
                  ? 'Admin'
                  : user?.role === 'direzione'
                    ? 'Direzione'
                    : 'Dipendente'}
              </p>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              theme === 'light'
                ? 'border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10'
                : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
            }`}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg border-2 border-red-400/50 dark:border-red-500/30 px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
