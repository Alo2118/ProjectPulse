import { useMemo, useCallback } from "react"
import { Tag, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useTagListQuery } from "@/hooks/api/useTags"

interface TagFilterProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  className?: string
}

export function TagFilter({ selectedTagIds, onChange, className }: TagFilterProps) {
  const { data: allTags = [], isLoading } = useTagListQuery()
  const typedTags = allTags as Array<{ id: string; name: string; color?: string }>

  const selectedSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds])

  const handleToggle = useCallback(
    (tagId: string) => {
      if (selectedSet.has(tagId)) {
        onChange(selectedTagIds.filter((id) => id !== tagId))
      } else {
        onChange([...selectedTagIds, tagId])
      }
    },
    [selectedSet, selectedTagIds, onChange]
  )

  const label = selectedTagIds.length > 0 ? `Tag (${selectedTagIds.length})` : "Tag"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5",
            selectedTagIds.length > 0 && "border-primary/50 bg-primary/5 text-primary",
            className
          )}
        >
          <Tag className="h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca tag..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Caricamento..." : "Nessun tag trovato"}
            </CommandEmpty>
            <CommandGroup>
              {typedTags.map((tag) => {
                const isSelected = selectedSet.has(tag.id)
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleToggle(tag.id)}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-input",
                        isSelected && "border-primary bg-primary text-primary-foreground"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {tag.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    <span className="truncate">{tag.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
