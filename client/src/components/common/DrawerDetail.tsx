import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface InfoGridItem {
  label: string
  value: React.ReactNode
}

interface DrawerDetailProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badges?: React.ReactNode
  infoGrid?: InfoGridItem[]
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function DrawerDetail({
  open,
  onClose,
  title,
  subtitle,
  badges,
  infoGrid,
  children,
  footer,
  className,
}: DrawerDetailProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className={cn('flex w-[420px] flex-col p-0 sm:max-w-[420px]', className)}>
        <SheetHeader className="space-y-1 px-5 pt-5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {badges && <div className="flex flex-wrap gap-1.5 pt-1">{badges}</div>}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-5 py-4">
            {infoGrid && infoGrid.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {infoGrid.map((item) => (
                    <div key={item.label}>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
                <Separator />
              </>
            )}
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <div className="border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
