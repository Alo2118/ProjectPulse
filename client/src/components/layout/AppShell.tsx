import { type ReactNode, useEffect, useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { ThemeProvider } from './ThemeProvider'
import { Sidebar } from './Sidebar'
import { PageContextProvider } from './PageContextProvider'
import { CommandPalette } from '@/components/features/CommandPalette'
import { NotificationPanel } from '@/components/features/NotificationPanel'
import { KeyboardShortcutsModal } from '@/components/features/KeyboardShortcutsModal'
import { RadialMenu, useRadialMenu } from '@/components/features/RadialMenu'
import { usePageContext } from '@/hooks/ui/usePageContext'
import { useCurrentUser } from '@/hooks/api/useAuth'
import { useSocket } from '@/hooks/useSocket'

interface AppShellProps {
  children: ReactNode
}

const DOMAIN_FAB_COLORS: Record<string, string> = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  red: 'bg-red-500 hover:bg-red-600',
  purple: 'bg-purple-500 hover:bg-purple-600',
  amber: 'bg-amber-500 hover:bg-amber-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  green: 'bg-green-500 hover:bg-green-600',
  indigo: 'bg-indigo-500 hover:bg-indigo-600',
  slate: 'bg-slate-500 hover:bg-slate-600',
}

function AppShellInner({ children }: AppShellProps) {
  const location = useLocation()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const setCommandPalette = useUIStore((s) => s.setCommandPalette)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const ctx = usePageContext()

  // Real-time socket connection — requires authenticated user
  const { data: currentUser } = useCurrentUser()
  const token = localStorage.getItem('accessToken')
  useSocket(token ?? null, currentUser?.id ?? null)

  const { isOpen, position, openMenu, closeMenu } = useRadialMenu()

  // Desktop: Ctrl+Space → open at viewport center
  const handleCtrlSpace = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === ' ') {
        e.preventDefault()
        if (isOpen) {
          closeMenu()
        } else {
          openMenu(window.innerWidth / 2, window.innerHeight / 2)
        }
      }
    },
    [isOpen, openMenu, closeMenu]
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPalette(!commandPaletteOpen)
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault()
          setShortcutsOpen(true)
        }
      }
      handleCtrlSpace(e)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPalette, handleCtrlSpace])

  // Desktop: right-click on main content area
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // Only intercept plain right-clicks (no modifier keys), not on interactive elements
      const target = e.target as HTMLElement
      const isInteractive = target.closest('button, a, input, textarea, select, [role="button"]')
      if (isInteractive) return
      e.preventDefault()
      openMenu(e.clientX, e.clientY)
    },
    [openMenu]
  )

  // Mobile FAB: open centered 120px above the button
  const handleFabClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isOpen) {
        closeMenu()
        return
      }
      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
      const fabCenterX = rect.left + rect.width / 2
      const fabCenterY = rect.top + rect.height / 2
      openMenu(fabCenterX, fabCenterY - 120)
    },
    [isOpen, openMenu, closeMenu]
  )

  const domainColor = ctx?.color ?? 'primary'

  return (
    // .app { display: flex; min-height: 100vh; }
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar />
      {/* .main { margin-left: 216px; flex: 1; padding: 0 0 48px; background: var(--bg-base); } */}
      <main
        className={cn(
          'flex-1 pb-12 transition-[margin-left] duration-200 ease-in-out',
          collapsed
            ? 'md:ml-[var(--sidebar-collapsed-width)]'
            : 'md:ml-[var(--sidebar-width)]'
        )}
        style={{ background: 'var(--bg-base)' }}
        onContextMenu={handleContextMenu}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile FAB — only on small screens */}
      <button
        type="button"
        aria-label={isOpen ? 'Chiudi menu azioni' : 'Apri menu azioni'}
        onClick={handleFabClick}
        className={cn(
          'fixed bottom-6 right-6 z-40 md:hidden',
          'h-14 w-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          DOMAIN_FAB_COLORS[domainColor] ?? 'bg-primary hover:bg-primary/90',
          'text-white'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>

      <RadialMenu isOpen={isOpen} position={position} onClose={closeMenu} />

      <CommandPalette />
      <NotificationPanel />
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ThemeProvider>
      <PageContextProvider>
        <AppShellInner>{children}</AppShellInner>
      </PageContextProvider>
    </ThemeProvider>
  )
}
