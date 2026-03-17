import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAttentionItemsQuery, type AttentionItem } from '@/hooks/api/useDashboard'

// --- Helpers ---

const ITEM_TYPE_CONFIG: Record<
  AttentionItem['type'],
  { emoji: string; label: string }
> = {
  blocked_task: { emoji: '🔴', label: 'Bloccato' },
  due_soon: { emoji: '⏰', label: 'In scadenza' },
  critical_risk: { emoji: '⚠️', label: 'Rischio critico' },
  pending_review: { emoji: '📄', label: 'In revisione' },
  milestone_at_risk: { emoji: '🏁', label: 'Milestone a rischio' },
}

function getDetailHref(item: AttentionItem): string {
  switch (item.type) {
    case 'blocked_task':
    case 'due_soon':
    case 'pending_review':
      return `/tasks/${item.entityId}`
    case 'critical_risk':
      return `/risks/${item.entityId}`
    case 'milestone_at_risk':
      return `/tasks/${item.entityId}`
    default:
      return '/'
  }
}

// --- Sub-components ---

function AttentionRow({ item, index }: { item: AttentionItem; index: number }) {
  const navigate = useNavigate()
  const config = ITEM_TYPE_CONFIG[item.type]

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn(
        'flex items-center gap-3 cursor-pointer rounded-md p-2',
        'hover:bg-accent/50 transition-colors'
      )}
      onClick={() => navigate(getDetailHref(item))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(getDetailHref(item))
      }}
      aria-label={`${config.label}: ${item.title}`}
    >
      <span className="text-base shrink-0" aria-hidden="true">
        {config.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.projectName && (
          <p className="text-xs text-muted-foreground truncate">{item.projectName}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
    </motion.div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  )
}

// --- Main Component ---

export function AttentionSection() {
  const { data, isLoading } = useAttentionItemsQuery(5)

  const items = (data as AttentionItem[] | null | undefined) ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
          Attenzione Richiesta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-2 py-6 text-center"
          >
            <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Tutto sotto controllo</p>
          </motion.div>
        ) : (
          <div className="space-y-1">
            {items.map((item, i) => (
              <AttentionRow key={`${item.entityId}-${i}`} item={item} index={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
