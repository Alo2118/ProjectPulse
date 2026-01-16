import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePendingRequestsCount } from '../hooks/usePendingRequestsCount';
import { 
  LogOut, User, LayoutDashboard, FolderKanban, Calendar, Users, 
  Clock, Inbox, FileText, Menu, X, ChevronDown, Home, BarChart3
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
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
      ]
    },
    {
      group: 'Gestione',
      items: [
        { to: '/calendar', icon: Calendar, label: 'Calendario', condition: true },
        { to: '/gantt', icon: FileText, label: 'Gantt', condition: true },
        { to: '/time-tracking', icon: Clock, label: 'Tempo', condition: user?.role !== 'direzione' },
        { to: '/templates', icon: FileText, label: 'Template', condition: user?.role !== 'direzione' },
        { to: '/reports', icon: BarChart3, label: 'Report', condition: true },
      ]
    },
    {
      group: 'Admin',
      items: [
        { to: '/users', icon: Users, label: 'Utenti', condition: user?.role === 'amministratore' },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => item.condition)
  })).filter(group => group.items.length > 0);

  const toggleMenu = (group) => {
    setExpandedMenu(expandedMenu === group ? null : group);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900/80 backdrop-blur-lg text-slate-100 transition-all duration-300 flex flex-col z-40 border-r-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 ${
          isOpen ? 'w-64' : 'w-0 -translate-x-full'
        } lg:w-64 lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-cyan-500/20">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-cyan-500/50">
              PP
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ProjectPulse</h1>
              <p className="text-xs text-cyan-400/70">v1.0</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6">
              <button
                onClick={() => toggleMenu(groupIdx)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-cyan-400/70 uppercase tracking-wider hover:text-cyan-300 transition-colors"
              >
                {group.group}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedMenu === groupIdx ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`space-y-1 transition-all overflow-hidden ${
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
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
                        active
                          ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                          : 'border-transparent text-slate-300 hover:border-cyan-500/30 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                      {active && !showBadge && (
                        <div className="ml-auto w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-500/50" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t-2 border-cyan-500/20 space-y-3">
          <div className="flex items-center gap-3 px-3 py-3 bg-slate-800/50 rounded-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-cyan-300 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-cyan-400/60 truncate capitalize">
                {user?.role === 'amministratore' ? 'Admin' : 
                 user?.role === 'direzione' ? 'Direzione' : 'Dipendente'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 border-2 border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
