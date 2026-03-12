import type { LucideIcon } from "lucide-react"

interface MetaRowProps {
  icon?: LucideIcon
  label: string
  children: React.ReactNode
}

export function MetaRow({ icon: Icon, label, children }: MetaRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="text-sm text-foreground text-right">{children}</div>
    </div>
  )
}
