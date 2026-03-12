import { Link } from 'react-router-dom'
import { Activity, Inbox } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatRelative } from '@/lib/utils'
import { useRecentActivityQuery, type RecentActivityItem } from '@/hooks/api/useDashboard'

// --- Helpers ---

const ACTION_VERB_MAP: Record<RecentActivityItem['action'], string> = {
  CREATE: 'creato',
  UPDATE: 'aggiornato',
  DELETE: 'eliminato',
  STATUS_CHANGE: 'cambiato stato di',
}

function getEntityHref(item: RecentActivityItem): string {
  switch (item.entityType) {
    case 'project':
      return `/projects/${item.entityId}`
    case 'task':
      return `/tasks/${item.entityId}`
    case 'risk':
      return `/risks/${item.entityId}`
    case 'document':
      return `/documents/${item.entityId}`
    case 'user_input':
      return `/inputs/${item.entityId}`
    default:
      return '/'
  }
}

// --- Sub-components ---

function ActivityRow({ item, index }: { item: RecentActivityItem; index: number }) {
  const verb = ACTION_VERB_MAP[item.action] ?? 'aggiornato'
  const href = getEntityHref(item)
  const isDeleted = item.action === 'DELETE'

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="flex items-start gap-3 py-2 border-b border-border last:border-0"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm leading-snug">
          <span className="font-medium">
            {item.user.firstName} {item.user.lastName}
          </span>{' '}
          <span className="text-muted-foreground">ha {verb}</span>{' '}
          {isDeleted ? (
            <span className="font-medium line-through text-muted-foreground">
              {item.entityName}
            </span>
          ) : (
            <Link
              to={href}
              className={cn(
                'font-medium hover:text-primary transition-colors underline-offset-2 hover:underline'
              )}
            >
              {item.entityName}
            </Link>
          )}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatRelative(item.createdAt)}
        </p>
      </div>
    </motion.div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Main Component ---

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivityQuery(10)

  const items = (data as RecentActivityItem[] | null | undefined) ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          Attività Recente
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
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nessuna attività recente</p>
          </motion.div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="pr-4">
              {items.map((item, i) => (
                <ActivityRow key={item.id} item={item} index={i} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
