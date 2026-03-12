import { LayoutList, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ViewToggleProps {
  value: 'list' | 'grid'
  onChange: (view: 'list' | 'grid') => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-md border border-border', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 rounded-r-none px-2',
          value === 'list' && 'bg-primary/10 text-primary'
        )}
        onClick={() => onChange('list')}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 rounded-l-none px-2',
          value === 'grid' && 'bg-primary/10 text-primary'
        )}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  )
}
