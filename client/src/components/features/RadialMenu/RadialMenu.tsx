import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useThemeConfig } from '@/hooks/ui/useThemeConfig'
import { usePageContext } from '@/hooks/ui/usePageContext'
import { usePermissions } from '@/hooks/ui/usePermissions'
import { getActionsForContext } from '@/lib/radial-actions'
import { RadialMenuItem } from './RadialMenuItem'
import { RadialSubMenu } from './RadialSubMenu'
import { useRadialMenu } from './useRadialMenu'
import type { RadialAction } from '@/lib/radial-actions'

interface RadialMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
}

/** Center dot showing the domain icon */
function CenterDot({
  position,
  color,
  Icon,
}: {
  position: { x: number; y: number }
  color: string
  Icon: React.ElementType
}) {
  const { theme } = useThemeConfig()
  return (
    <motion.div
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full',
        'flex items-center justify-center pointer-events-none',
        `bg-${color}-500 text-white`,
        theme === 'tech-hud' && `shadow-[0_0_12px] shadow-${color}-500/60`
      )}
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <Icon className="h-5 w-5" />
    </motion.div>
  )
}

/** SVG connector lines for Tech HUD theme */
function HudLines({
  center,
  positions,
}: {
  center: { x: number; y: number }
  positions: { x: number; y: number }[]
}) {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[51] overflow-visible"
      style={{ left: 0, top: 0, width: '100vw', height: '100vh' }}
    >
      {positions.map((pos, i) => (
        <motion.line
          key={i}
          x1={center.x}
          y1={center.y}
          x2={pos.x}
          y2={pos.y}
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          exit={{ pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.2, delay: i * 0.03 }}
        />
      ))}
    </svg>
  )
}

export function RadialMenu({ isOpen, position, onClose }: RadialMenuProps) {
  const navigate = useNavigate()
  const { theme } = useThemeConfig()
  const ctx = usePageContext()
  const permissions = usePermissions(ctx?.domain)
  const { subMenuAction, openSubMenu, closeSubMenu, calculatePositions } = useRadialMenu()
  const focusedIndexRef = useRef<number>(-1)
  const itemRefs = useRef<HTMLButtonElement[]>([])

  // Determine scope from entityId presence
  const scope = ctx?.entityId ? 'detail' : 'list'
  const domain = ctx?.domain ?? 'home'

  const actions = getActionsForContext(domain, scope, permissions)
  const positions = calculatePositions(position.x, position.y, actions.length, 100)

  // Active sub-menu actions
  const activeSubAction = actions.find((a) => a.id === subMenuAction)
  const subActions = activeSubAction?.subActions ?? []

  // Close on Escape, cycle on Arrow keys
  useEffect(() => {
    if (!isOpen) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (subMenuAction) {
          closeSubMenu()
        } else {
          onClose()
        }
        return
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = (focusedIndexRef.current + 1) % actions.length
        focusedIndexRef.current = next
        itemRefs.current[next]?.focus()
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = (focusedIndexRef.current - 1 + actions.length) % actions.length
        focusedIndexRef.current = prev
        itemRefs.current[prev]?.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, actions.length, subMenuAction, closeSubMenu, onClose])

  const handleActivate = useCallback(
    (action: RadialAction) => {
      if (action.subActions?.length) {
        openSubMenu(action.id)
        return
      }
      action.action({ navigate, entityId: ctx?.entityId })
      onClose()
    },
    [navigate, ctx?.entityId, openSubMenu, onClose]
  )

  const handleSubActivate = useCallback(
    (action: RadialAction) => {
      action.action({ navigate, entityId: ctx?.entityId })
      onClose()
    },
    [navigate, ctx?.entityId, onClose]
  )

  if (!isOpen) return null

  const DomainIcon = ctx?.icon ?? (() => null)
  const domainColor = ctx?.color ?? 'primary'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent backdrop — click to close */}
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Tech HUD: SVG connector lines */}
          {theme === 'tech-hud' && !subMenuAction && (
            <HudLines center={position} positions={positions} />
          )}

          {/* Menu role container (accessible) */}
          <div
            role="menu"
            aria-label="Menu azioni rapide"
            className={cn('fixed z-[52] pointer-events-none')}
            style={{ left: 0, top: 0, width: '100vw', height: '100vh' }}
          >
            {/* Center domain dot */}
            <CenterDot
              position={position}
              color={domainColor}
              Icon={DomainIcon}
            />

            {/* Main actions */}
            {!subMenuAction &&
              actions.map((action, index) => (
                <RadialMenuItem
                  key={action.id}
                  action={action}
                  position={positions[index] ?? position}
                  index={index}
                  onActivate={handleActivate}
                />
              ))}

            {/* Sub-menu */}
            {subMenuAction && activeSubAction && (
              <RadialSubMenu
                actions={subActions}
                parentPosition={
                  positions[actions.findIndex((a) => a.id === subMenuAction)] ?? position
                }
                onActivate={handleSubActivate}
                onBack={closeSubMenu}
              />
            )}
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
