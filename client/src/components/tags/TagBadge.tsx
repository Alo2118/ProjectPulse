/**
 * TagBadge - Displays a single tag as a colored badge
 * @module components/tags/TagBadge
 */

import { X } from 'lucide-react'
import { Tag } from '@/types'

interface TagBadgeProps {
  tag: Tag
  size?: 'sm' | 'md'
  onRemove?: () => void
}

/**
 * Converts hex color to rgba for background with opacity
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function TagBadge({ tag, size = 'sm', onRemove }: TagBadgeProps) {
  const isSmall = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${
        isSmall ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
      }`}
      style={{
        backgroundColor: hexToRgba(tag.color, 0.15),
        color: tag.color,
      }}
    >
      <span
        className={`rounded-full ${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Rimuovi tag ${tag.name}`}
        >
          <X className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </span>
  )
}
