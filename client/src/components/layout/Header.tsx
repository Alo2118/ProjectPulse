import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Palette,
  Monitor,
  Sun,
  Moon,
  Check,
} from 'lucide-react'
import { cn, getUserInitials, getAvatarColor } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNotificationUIStore } from '@/stores/notificationUiStore'
import { useCurrentUser, useLogout } from '@/hooks/api/useAuth'
import { usePageContext } from '@/hooks/ui/usePageContext'
import { useThemeConfig } from '@/hooks/ui/useThemeConfig'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ThemeStyle, ThemeMode } from '@/types'

// --- Theme-adaptive header background colors (static maps for Tailwind) ---

// Tech HUD: dark tinted bg with subtle glow border, light text
const HEADER_HUD: Record<string, string> = {
  blue:    'bg-blue-950/80 text-blue-100 border-b border-blue-500/30',
  red:     'bg-red-950/80 text-red-100 border-b border-red-500/30',
  purple:  'bg-purple-950/80 text-purple-100 border-b border-purple-500/30',
  amber:   'bg-amber-950/80 text-amber-100 border-b border-amber-500/30',
  emerald: 'bg-emerald-950/80 text-emerald-100 border-b border-emerald-500/30',
  green:   'bg-green-950/80 text-green-100 border-b border-green-500/30',
  indigo:  'bg-indigo-950/80 text-indigo-100 border-b border-indigo-500/30',
  slate:   'bg-slate-950/80 text-slate-100 border-b border-slate-500/30',
}

// Asana Like: warm pastel bg light, rich tinted bg dark
const HEADER_ASANA: Record<string, string> = {
  blue:    'bg-blue-100/90 text-blue-900 border-b border-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-600/50',
  red:     'bg-red-100/90 text-red-900 border-b border-red-300 dark:bg-red-900/50 dark:text-red-100 dark:border-red-600/50',
  purple:  'bg-purple-100/90 text-purple-900 border-b border-purple-300 dark:bg-purple-900/50 dark:text-purple-100 dark:border-purple-600/50',
  amber:   'bg-amber-100/90 text-amber-900 border-b border-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-600/50',
  emerald: 'bg-emerald-100/90 text-emerald-900 border-b border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border-emerald-600/50',
  green:   'bg-green-100/90 text-green-900 border-b border-green-300 dark:bg-green-900/50 dark:text-green-100 dark:border-green-600/50',
  indigo:  'bg-indigo-100/90 text-indigo-900 border-b border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-100 dark:border-indigo-600/50',
  slate:   'bg-slate-100/90 text-slate-900 border-b border-slate-300 dark:bg-slate-900/50 dark:text-slate-100 dark:border-slate-600/50',
}

// Office Classic: subtle tint + strong colored bottom border
const HEADER_OFFICE: Record<string, string> = {
  blue:    'bg-blue-50 text-foreground border-b-2 !border-b-blue-500 border-x-0 border-t-0 dark:bg-blue-950/50 dark:border-b-blue-400',
  red:     'bg-red-50 text-foreground border-b-2 !border-b-red-500 border-x-0 border-t-0 dark:bg-red-950/50 dark:border-b-red-400',
  purple:  'bg-purple-50 text-foreground border-b-2 !border-b-purple-500 border-x-0 border-t-0 dark:bg-purple-950/50 dark:border-b-purple-400',
  amber:   'bg-amber-50 text-foreground border-b-2 !border-b-amber-500 border-x-0 border-t-0 dark:bg-amber-950/50 dark:border-b-amber-400',
  emerald: 'bg-emerald-50 text-foreground border-b-2 !border-b-emerald-500 border-x-0 border-t-0 dark:bg-emerald-950/50 dark:border-b-emerald-400',
  green:   'bg-green-50 text-foreground border-b-2 !border-b-green-500 border-x-0 border-t-0 dark:bg-green-950/50 dark:border-b-green-400',
  indigo:  'bg-indigo-50 text-foreground border-b-2 !border-b-indigo-500 border-x-0 border-t-0 dark:bg-indigo-950/50 dark:border-b-indigo-400',
  slate:   'bg-slate-50 text-foreground border-b-2 !border-b-slate-500 border-x-0 border-t-0 dark:bg-slate-950/50 dark:border-b-slate-400',
}

function getHeaderColorClasses(theme: ThemeStyle, domainColor: string): string {
  switch (theme) {
    case 'tech-hud':
      return HEADER_HUD[domainColor] ?? ''
    case 'asana-like':
      return HEADER_ASANA[domainColor] ?? ''
    case 'office-classic':
      return HEADER_OFFICE[domainColor] ?? ''
    default:
      return ''
  }
}

const THEME_STYLE_LABELS: Record<ThemeStyle, string> = {
  'office-classic': 'Office Classic',
  'asana-like': 'Asana Like',
  'tech-hud': 'Tech HUD',
}

const THEME_MODE_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

const THEME_STYLES: ThemeStyle[] = ['office-classic', 'asana-like', 'tech-hud']

export function Header() {
  const navigate = useNavigate()
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebar)
  const setCommandPalette = useUIStore((s) => s.setCommandPalette)
  const { theme, mode, setTheme, setMode } = useThemeStore()
  const setPanelOpen = useNotificationUIStore((s) => s.setPanelOpen)
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()
  const ctx = usePageContext()
  const { getIconWrapper } = useThemeConfig()

  const CtxIcon = ctx?.icon
  const iconWrapperClass = ctx ? getIconWrapper(ctx.color) : ''
  const domainColor = ctx?.color ?? ''
  const headerColorClasses = domainColor ? getHeaderColorClasses(theme, domainColor) : ''
  const hasColor = !!headerColorClasses

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-[var(--header-height)] items-center gap-3 px-4 backdrop-blur-sm transition-colors duration-200',
        hasColor
          ? headerColorClasses
          : 'border-b border-border bg-card/80'
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={() => setMobileSidebar(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Context-aware page title with domain icon */}
      <div className="flex items-center gap-2 min-w-0">
        {CtxIcon && (
          <div className={cn('shrink-0', hasColor ? '' : iconWrapperClass)}>
            <CtxIcon className="h-4.5 w-4.5" />
          </div>
        )}
        <h1 className="text-base font-semibold truncate">
          {ctx?.label ?? 'ProjectPulse'}
        </h1>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', hasColor ? 'text-current/70 hover:text-current' : 'text-muted-foreground hover:text-foreground')}
          onClick={() => setCommandPalette(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-8 w-8', hasColor ? 'text-current/70 hover:text-current' : 'text-muted-foreground hover:text-foreground')}
          onClick={() => setPanelOpen(true)}
        >
          <Bell className="h-4 w-4" />
        </Button>

        {/* Theme selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', hasColor ? 'text-current/70 hover:text-current' : 'text-muted-foreground hover:text-foreground')}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tema
            </DropdownMenuLabel>
            {THEME_STYLES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => setTheme(s)}
                className="flex items-center justify-between"
              >
                <span>{THEME_STYLE_LABELS[s]}</span>
                {theme === s && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Modalità
            </DropdownMenuLabel>
            {THEME_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setMode(value)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
                {mode === value && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white',
                    getAvatarColor(`${user.firstName} ${user.lastName}`)
                  )}
                >
                  {getUserInitials(user.firstName, user.lastName)}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profilo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
