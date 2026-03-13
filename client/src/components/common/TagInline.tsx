import { useMemo, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TagItem {
  id: string
  name: string
  color?: string
}

interface TagInlineProps {
  tags: TagItem[]
  max?: number
  onTagClick?: (tagId: string) => void
  className?: string
}

export function TagInline({ tags, max = 3, onTagClick, className }: TagInlineProps) {
  const visible = useMemo(() => tags.slice(0, max), [tags, max])
  const overflow = tags.length - max

  const handleClick = useCallback(
    (tagId: string) => (e: React.MouseEvent) => {
      e.stopPropagation()
      onTagClick?.(tagId)
    },
    [onTagClick]
  )

  if (tags.length === 0) return null

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "text-xs px-1.5 py-0 font-normal",
            onTagClick && "cursor-pointer hover:bg-accent",
            tag.color && "border-transparent"
          )}
          style={
            tag.color
              ? { backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }
              : undefined
          }
          onClick={onTagClick ? handleClick(tag.id) : undefined}
        >
          {tag.name}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge
          variant="outline"
          className="text-xs px-1.5 py-0 font-normal text-muted-foreground"
        >
          +{overflow}
        </Badge>
      )}
    </div>
  )
}
