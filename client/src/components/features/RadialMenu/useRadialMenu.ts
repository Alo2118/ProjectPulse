import { useState, useCallback } from 'react'

export interface Position {
  x: number
  y: number
}

export interface ItemPosition {
  x: number
  y: number
  angle: number
}

export function useRadialMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [subMenuAction, setSubMenuAction] = useState<string | null>(null)

  const openMenu = useCallback((x: number, y: number) => {
    setPosition({ x, y })
    setIsOpen(true)
    setSubMenuAction(null)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSubMenuAction(null)
  }, [])

  const openSubMenu = useCallback((actionId: string) => {
    setSubMenuAction(actionId)
  }, [])

  const closeSubMenu = useCallback(() => {
    setSubMenuAction(null)
  }, [])

  const calculatePositions = useCallback(
    (
      centerX: number,
      centerY: number,
      itemCount: number,
      radius: number = 100
    ): ItemPosition[] => {
      if (itemCount === 0) return []

      const vw = window.innerWidth
      const vh = window.innerHeight
      const padding = 50

      // Determine angular restrictions based on viewport edge proximity
      let startAngle = 0
      let endAngle = 360
      let restricted = false

      const nearLeft = centerX < radius + padding
      const nearRight = centerX > vw - radius - padding
      const nearTop = centerY < radius + padding
      const nearBottom = centerY > vh - radius - padding

      if (nearLeft && !nearRight) {
        startAngle = -90
        endAngle = 90
        restricted = true
      } else if (nearRight && !nearLeft) {
        startAngle = 90
        endAngle = 270
        restricted = true
      }

      if (nearTop && !nearBottom) {
        if (restricted) {
          // Intersect with bottom restriction
          startAngle = Math.max(startAngle, 0)
          endAngle = Math.min(endAngle, 180)
        } else {
          startAngle = 0
          endAngle = 180
          restricted = true
        }
      } else if (nearBottom && !nearTop) {
        if (restricted) {
          // Intersect with top restriction
          startAngle = Math.max(startAngle, 180)
          endAngle = Math.min(endAngle, 360)
        } else {
          startAngle = 180
          endAngle = 360
          restricted = true
        }
      }

      if (!restricted) {
        // Full circle — start from top (-90°) and distribute evenly
        const angleStep = 360 / itemCount
        return Array.from({ length: itemCount }, (_, i) => {
          const angle = -90 + i * angleStep
          const rad = (angle * Math.PI) / 180
          return {
            x: centerX + radius * Math.cos(rad),
            y: centerY + radius * Math.sin(rad),
            angle,
          }
        })
      }

      // Restricted arc — distribute evenly within the allowed angular range
      const range = endAngle - startAngle
      const angleStep = itemCount > 1 ? range / (itemCount - 1) : 0
      return Array.from({ length: itemCount }, (_, i) => {
        const angle = startAngle + i * angleStep
        const rad = (angle * Math.PI) / 180
        return {
          x: centerX + radius * Math.cos(rad),
          y: centerY + radius * Math.sin(rad),
          angle,
        }
      })
    },
    []
  )

  return {
    isOpen,
    position,
    subMenuAction,
    openMenu,
    closeMenu,
    openSubMenu,
    closeSubMenu,
    calculatePositions,
  }
}
