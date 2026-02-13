/**
 * TagList - Displays a read-only list of tag badges
 * @module components/tags/TagList
 */

import { Tag } from '@/types'
import TagBadge from './TagBadge'

interface TagListProps {
  tags: Tag[]
  size?: 'sm' | 'md'
}

export default function TagList({ tags, size = 'sm' }: TagListProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} size={size} />
      ))}
    </div>
  )
}
