import { motion } from "framer-motion"
import { History } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/EmptyState"
import { useActivityQuery } from "@/hooks/api/useActivity"
import { cn, getUserInitials, getAvatarColor, formatRelative } from "@/lib/utils"
import type { ActivityItem } from "@/types"

interface ActivityTabProps {
  entityType: string
  entityId: string
  limit?: number
}

const ACTION_LABELS: Record<string, string> = {
  created: "ha creato",
  updated: "ha modificato",
  deleted: "ha eliminato",
  status_changed: "ha modificato lo stato",
  assigned: "ha assegnato",
  unassigned: "ha rimosso l'assegnazione",
  commented: "ha commentato",
  approved: "ha approvato",
  rejected: "ha rifiutato",
  uploaded: "ha caricato",
  phase_advanced: "ha avanzato la fase",
  completed: "ha completato",
}

const ACTION_DOT_COLORS: Record<string, string> = {
  created: "bg-green-500",
  completed: "bg-green-500",
  approved: "bg-green-500",
  updated: "bg-blue-500",
  status_changed: "bg-blue-500",
  assigned: "bg-violet-500",
  phase_advanced: "bg-violet-500",
  deleted: "bg-red-500",
  rejected: "bg-red-500",
  commented: "bg-amber-500",
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? `ha eseguito "${action}"`
}

function getDotColor(action: string): string {
  return ACTION_DOT_COLORS[action] ?? "bg-muted-foreground"
}

function FieldChange({ field, oldValue, newValue }: { field: string; oldValue?: string; newValue?: string }) {
  if (!oldValue && !newValue) return null
  return (
    <div className="mt-1 text-xs text-muted-foreground">
      <span className="font-medium">{field}</span>
      {": "}
      {oldValue && (
        <span className="line-through text-muted-foreground/70">{oldValue}</span>
      )}
      {oldValue && newValue && " → "}
      {newValue && (
        <span className="text-foreground">{newValue}</span>
      )}
    </div>
  )
}

function TimelineItem({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  const user = item.user
  const authorName = `${user.firstName} ${user.lastName}`
  const initials = getUserInitials(user.firstName, user.lastName)
  const avatarColor = getAvatarColor(authorName)
  const dotColor = getDotColor(item.action)

  return (
    <motion.div
      className="relative flex gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1.5", dotColor)} />
        {!isLast && (
          <div className="w-px flex-1 bg-border mt-1" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className={cn(avatarColor, "text-white text-[10px]")}>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium text-foreground">{authorName}</span>
              {" "}
              <span className="text-muted-foreground">{getActionLabel(item.action)}</span>
            </p>
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelative(item.createdAt)}
          </span>
        </div>

        {item.field && (
          <div className="ml-8">
            <FieldChange
              field={item.field}
              oldValue={item.oldValue}
              newValue={item.newValue}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5" />
            {i < 4 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className={cn("flex-1", i < 4 ? "pb-6" : "pb-0")}>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityTab({ entityType, entityId, limit = 20 }: ActivityTabProps) {
  const { data: activities, isLoading } = useActivityQuery(entityType, entityId, limit)

  if (isLoading) {
    return <TimelineSkeleton />
  }

  const activityList = (activities ?? []) as ActivityItem[]

  if (activityList.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nessuna attività"
        description="Le attività appariranno qui quando vengono effettuate modifiche."
      />
    )
  }

  return (
    <motion.div
      className="space-y-0"
      initial="initial"
      animate="animate"
      variants={{
        animate: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {activityList.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isLast={index === activityList.length - 1}
        />
      ))}
    </motion.div>
  )
}
