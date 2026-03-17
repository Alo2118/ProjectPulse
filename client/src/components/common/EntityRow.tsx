import { type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { cn, getUserInitials, getAvatarColor } from "@/lib/utils"
import {
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  RISK_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  INPUT_STATUS_LABELS,
} from "@/lib/constants"
import { useThemeConfig } from "@/hooks/ui/useThemeConfig"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ProgressBar, getDomainGradient } from "@/components/common/ProgressBar"
import { DeadlineCell } from "@/components/common/DeadlineCell"
import { ProblemIndicators } from "@/components/common/ProblemIndicators"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DOMAIN_COLORS } from "@/lib/constants"

// --- Status label maps by entity type ---

const STATUS_LABELS_MAP: Record<string, Record<string, string>> = {
  project: PROJECT_STATUS_LABELS,
  task: TASK_STATUS_LABELS,
  risk: RISK_STATUS_LABELS,
  document: DOCUMENT_STATUS_LABELS,
  userInput: INPUT_STATUS_LABELS,
}

// --- Domain color for icon wrapper (text color only) ---

const DOMAIN_ICON_COLORS: Record<string, string> = {
  project: "text-blue-600 dark:text-blue-400",
  task: "text-amber-600 dark:text-amber-400",
  risk: "text-red-600 dark:text-red-400",
  document: "text-purple-600 dark:text-purple-400",
  userInput: "text-green-600 dark:text-green-400",
}

// --- Map entityType to DOMAIN_COLORS key for ProgressBar ---

const ENTITY_TO_DOMAIN: Record<string, keyof typeof DOMAIN_COLORS> = {
  project: "project",
  task: "task",
  risk: "risk",
  document: "document",
  userInput: "project",
}

// --- Props ---

interface EntityRowProps {
  id: string
  name: string
  status: string
  entityType: string
  onClick: () => void

  code?: string
  progress?: number
  assignee?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string
  }
  deadline?: string
  priority?: string
  tags?: Array<{ id: string; name: string; color?: string }>
  indicators?: {
    blockedTasks?: number
    openRisks?: number
    comments?: number
    checklistDone?: number
    checklistTotal?: number
  }
  subtitle?: string
  extraBadges?: ReactNode
  isLoading?: boolean
}

// --- Skeleton Row ---

function EntityRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Skeleton className="h-8 w-8 rounded shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-16 rounded-md" />
      <Skeleton className="h-4 w-4 rounded shrink-0" />
    </div>
  )
}

// --- Component ---

export function EntityRow({
  name,
  status,
  entityType,
  onClick,
  code,
  progress,
  assignee,
  deadline,
  tags,
  indicators,
  subtitle,
  extraBadges,
  isLoading,
}: EntityRowProps) {
  const { icons } = useThemeConfig()

  if (isLoading) {
    return <EntityRowSkeleton />
  }

  const Icon = icons[entityType] ?? icons.task
  const statusLabels = STATUS_LABELS_MAP[entityType] ?? TASK_STATUS_LABELS
  const iconColor = DOMAIN_ICON_COLORS[entityType] ?? "text-muted-foreground"
  const domainKey = ENTITY_TO_DOMAIN[entityType] ?? "project"

  const assigneeName = assignee
    ? `${assignee.firstName} ${assignee.lastName}`
    : ""

  return (
    <motion.div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer rounded-lg border border-border/50",
        "hover:bg-accent/50 transition-colors duration-150"
      )}
      whileHover={{ scale: 1.0 }}
      transition={{ duration: 0.15, type: "tween" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Domain Icon */}
      <div className={cn("shrink-0 p-1.5", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{name}</span>
          {code && (
            <span className="text-xs text-muted-foreground shrink-0">
              {code}
            </span>
          )}
          {tags && tags.length > 0 && (
            <div className="hidden sm:flex gap-1 shrink-0">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs px-1.5 py-0"
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          {extraBadges}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Status */}
      <StatusBadge
        status={status}
        labels={statusLabels}
        className="shrink-0"
      />

      {/* Progress */}
      {progress != null && (
        <ProgressBar
          value={progress}
          gradient={getDomainGradient(domainKey)}
          size="thin"
          className="w-20 shrink-0 hidden md:flex"
        />
      )}

      {/* Assignee Avatar */}
      {assignee && (
        <Avatar className="h-6 w-6 shrink-0" title={assigneeName}>
          <AvatarFallback
            className={cn(
              "text-[10px] text-white",
              getAvatarColor(assigneeName)
            )}
          >
            {getUserInitials(assignee.firstName, assignee.lastName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Deadline */}
      {deadline && (
        <DeadlineCell
          dueDate={deadline}
          status={status}
          className="shrink-0 hidden lg:inline-flex"
        />
      )}

      {/* Problem Indicators */}
      {indicators && (
        <ProblemIndicators
          {...indicators}
          className="shrink-0 hidden lg:inline-flex"
        />
      )}

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </motion.div>
  )
}
