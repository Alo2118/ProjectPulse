import { Shield, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ViewRole = 'direzione' | 'dipendente'

interface RoleSwitcherProps {
  value: ViewRole
  onChange: (role: ViewRole) => void
  className?: string
}

export function RoleSwitcher({ value, onChange, className }: RoleSwitcherProps) {
  return (
    <div className={cn('flex items-center gap-1 rounded-md border border-border p-0.5', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-3 text-xs',
          value === 'direzione' && 'bg-primary/10 text-primary border border-primary/20'
        )}
        onClick={() => onChange('direzione')}
      >
        <Shield className="h-3.5 w-3.5" />
        Direzione
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1.5 px-3 text-xs',
          value === 'dipendente' && 'bg-primary/10 text-primary border border-primary/20'
        )}
        onClick={() => onChange('dipendente')}
      >
        <User className="h-3.5 w-3.5" />
        Dipendente
      </Button>
    </div>
  )
}
