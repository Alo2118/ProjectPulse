import { useState, useMemo, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  useTagListQuery,
  useEntityTagsQuery,
  useAssignTag,
  useUnassignTag,
} from "@/hooks/api/useTags"

interface TagEditorProps {
  entityType: string
  entityId: string
  className?: string
}

export function TagEditor({ entityType, entityId, className }: TagEditorProps) {
  const [open, setOpen] = useState(false)

  const { data: allTags = [], isLoading: loadingAll } = useTagListQuery()
  const { data: entityTags = [], isLoading: loadingEntity } = useEntityTagsQuery(entityType, entityId)
  const assignTag = useAssignTag()
  const unassignTag = useUnassignTag()

  const entityTagIds = useMemo(
    () => new Set((entityTags as Array<{ id: string }>).map((t) => t.id)),
    [entityTags]
  )

  const availableTags = useMemo(
    () => (allTags as Array<{ id: string; name: string; color?: string }>).filter((t) => !entityTagIds.has(t.id)),
    [allTags, entityTagIds]
  )

  const handleAssign = useCallback(
    (tagId: string) => {
      assignTag.mutate({ tagId, entityType, entityId })
      setOpen(false)
    },
    [assignTag, entityType, entityId]
  )

  const handleUnassign = useCallback(
    (tagId: string) => {
      unassignTag.mutate({ tagId, entityType, entityId })
    },
    [unassignTag, entityType, entityId]
  )

  if (loadingEntity) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    )
  }

  const typedEntityTags = entityTags as Array<{ id: string; name: string; color?: string }>

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {typedEntityTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn("text-xs px-1.5 py-0 font-normal gap-1", tag.color && "border-transparent")}
          style={
            tag.color
              ? { backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }
              : undefined
          }
        >
          {tag.name}
          <button
            type="button"
            className="ml-0.5 rounded-full outline-none hover:bg-foreground/10 focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => handleUnassign(tag.id)}
            aria-label={`Rimuovi tag ${tag.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-foreground"
            aria-label="Aggiungi tag"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-0" align="start">
          <Command>
            <CommandInput placeholder="Cerca tag..." />
            <CommandList>
              <CommandEmpty>
                {loadingAll ? "Caricamento..." : "Nessun tag trovato"}
              </CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleAssign(tag.id)}
                  >
                    {tag.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    <span className="truncate">{tag.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {typedEntityTags.length === 0 && !open && (
        <span className="text-xs text-muted-foreground">Aggiungi tag...</span>
      )}
    </div>
  )
}
