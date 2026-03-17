import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeConfig } from '@/hooks/ui/useThemeConfig'
import { RadialMenuItem } from './RadialMenuItem'
import { useRadialMenu } from './useRadialMenu'
import type { RadialAction } from '@/lib/radial-actions'

interface RadialSubMenuProps {
  actions: RadialAction[]
  parentPosition: { x: number; y: number }
  onActivate: (action: RadialAction) => void
  onBack: () => void
}

export function RadialSubMenu({
  actions,
  parentPosition,
  onActivate,
  onBack,
}: RadialSubMenuProps) {
  const { theme } = useThemeConfig()
  const { calculatePositions } = useRadialMenu()

  // Keyboard handler: Escape goes back
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onBack])

  const positions = calculatePositions(
    parentPosition.x,
    parentPosition.y,
    actions.length,
    70 // smaller radius for sub-menu
  )

  const backButtonClass = cn(
    'absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10',
    'flex items-center justify-center cursor-pointer',
    'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    theme === 'office-classic' && 'bg-card border border-border shadow-sm rounded-lg hover:bg-accent',
    theme === 'asana-like' && 'bg-card/90 backdrop-blur-sm rounded-full shadow-md hover:bg-accent',
    theme === 'tech-hud' && [
      'bg-card/80 border border-primary/20 rounded-sm',
      'shadow-[0_0_8px] shadow-primary/20 hover:border-primary/50',
    ]
  )

  return (
    <AnimatePresence>
      {/* Back button centered on the parent item position */}
      <motion.button
        type="button"
        aria-label="Indietro"
        className={backButtonClass}
        style={{ left: parentPosition.x, top: parentPosition.y }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </motion.button>

      {/* Sub-action items */}
      {actions.map((action, index) => (
        <RadialMenuItem
          key={action.id}
          action={action}
          position={positions[index] ?? parentPosition}
          index={index}
          onActivate={onActivate}
        />
      ))}
    </AnimatePresence>
  )
}
