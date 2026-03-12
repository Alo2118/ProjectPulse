import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'

interface EditableOption {
  value: string
  label: string
  dot?: string       // Tailwind bg-* class for color dot
  icon?: React.ReactNode
}

interface EditableBadgeProps {
  value: string
  options: EditableOption[]
  onChange: (value: string) => void
  displayLabel?: string
  displayDot?: string
  displayIcon?: React.ReactNode
  searchable?: boolean
  disabled?: boolean
  className?: string
}

export function EditableBadge({
  value,
  options,
  onChange,
  displayLabel,
  displayDot,
  displayIcon,
  searchable = false,
  disabled = false,
  className,
}: EditableBadgeProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const label = displayLabel ?? selected?.label ?? value
  const dot = displayDot ?? selected?.dot
  const icon = displayIcon ?? selected?.icon

  if (disabled) {
    return (
      <Badge variant="outline" className={cn('gap-1.5', className)}>
        {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
        {icon}
        {label}
      </Badge>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5',
            className
          )}
        >
          {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
          {icon}
          {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <Command>
          {searchable && <CommandInput placeholder="Cerca..." />}
          <CommandList>
            <CommandEmpty>Nessun risultato</CommandEmpty>
            {options.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.value}
                onSelect={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="gap-2"
              >
                {opt.dot && <span className={cn('h-2 w-2 rounded-full', opt.dot)} />}
                {opt.icon}
                <span>{opt.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
