import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, LayoutDashboard, FolderKanban, BarChart3, Calendar, Users, Clock, Inbox, FileText, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { colors, spacing, layouts } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navLinks = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'Dashboard',
      condition: true,
      isActiveCheck: () => isActive('/') && !location.pathname.includes('/projects') && !location.pathname.includes('/gantt') && !location.pathname.includes('/calendar') && !location.pathname.includes('/users') && !location.pathname.includes('/templates')
    },
    {
      to: '/projects',
      icon: FolderKanban,
      label: 'Progetti',
      condition: true,
      isActiveCheck: () => isActive('/projects')
    },
    {
      to: '/calendar',
      icon: Calendar,
      label: 'Calendario',
      condition: true,
      isActiveCheck: () => isActive('/calendar')
    },
    {
      to: '/inbox',
      icon: Inbox,
      label: 'Inbox',
      condition: true,
      isActiveCheck: () => isActive('/inbox')
    },
    {
      to: '/time-tracking',
      icon: Clock,
      label: 'Tempo',
      condition: user?.role !== 'direzione',
      isActiveCheck: () => isActive('/time-tracking')
    },
    {
      to: '/gantt',
      icon: BarChart3,
      label: 'Gantt',
      condition: true,
      isActiveCheck: () => isActive('/gantt')
    },
    {
      to: '/templates',
      icon: FileText,
      label: 'Template',
      condition: user?.role !== 'direzione', // Direzione non può accedere ai template
      isActiveCheck: () => isActive('/templates')
    },
    {
      to: '/users',
      icon: Users,
      label: 'Utenti',
      condition: user?.role === 'amministratore',
      isActiveCheck: () => isActive('/users')
    }
  ].filter(link => link.condition);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className={`${colors.bg.primary} ${colors.text.primary} shadow-md border-b-2 ${colors.border}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" onClick={handleLinkClick}>
              <h1 className="text-xl sm:text-2xl font-bold text-cyan-500 dark:text-cyan-400">ProjectPulse</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    link.isActiveCheck()
                      ? `${colors.accentBg} ${colors.accent}`
                      : `${colors.text.secondary} ${colors.bg.hover}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop User Info & Logout */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className={`w-5 h-5 ${colors.text.secondary}`} />
              <div className="text-sm">
                <div className={`font-bold ${colors.text.primary}`}>{user?.first_name} {user?.last_name}</div>
                <div className={`${colors.text.secondary} capitalize text-xs`}>{user?.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${colors.text.primary} border-2 border-red-500/30 text-red-500 hover:bg-red-500/10`}
            >
              <LogOut className="w-4 h-4" />
              Esci
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg ${colors.text.secondary} ${colors.bg.hover}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-t-2 ${colors.border} ${colors.bg.primary}`}>
          <div className={`px-4 py-3 space-y-1`}>
            {/* User Info on Mobile */}
            <div className={`flex items-center gap-3 px-3 py-3 ${colors.bg.secondary} rounded-lg mb-3 border-2 ${colors.border}`}>
              <User className={`w-8 h-8 ${colors.text.secondary}`} />
              <div className="flex-1">
                <div className={`font-bold ${colors.text.primary}`}>{user?.first_name} {user?.last_name}</div>
                <div className={`text-sm ${colors.text.secondary} capitalize`}>{user?.role}</div>
              </div>
            </div>

            {/* Mobile Navigation Links */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    link.isActiveCheck()
                      ? `${colors.accentBg} ${colors.accent}`
                      : `${colors.text.secondary} ${colors.bg.hover}`
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}

            {/* Mobile Logout */}
            <button
              onClick={() => {
                logout();
                handleLinkClick();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors mt-2 border-2 border-red-500/30`}
            >
              <LogOut className="w-5 h-5" />
              Esci
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
