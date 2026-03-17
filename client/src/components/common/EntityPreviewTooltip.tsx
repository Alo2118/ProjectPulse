import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/common/StatusBadge"
import {
  TASK_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  RISK_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
} from "@/lib/constants"
import { formatDate } from "@/lib/utils"

export type PreviewEntityType = "project" | "task" | "risk" | "document"

interface EntityPreviewTooltipProps {
  entityType: PreviewEntityType
  entityId: string
  children: React.ReactNode
}

// TanStack Query key patterns matching the existing hooks
function buildQueryKey(entityType: PreviewEntityType, entityId: string): unknown[] {
  switch (entityType) {
    case "project":
      return ["projects", "detail", entityId]
    case "task":
      return ["tasks", "detail", entityId]
    case "risk":
      return ["risks", "detail", entityId]
    case "document":
      return ["documents", "detail", entityId]
  }
}

function useCachedEntity(entityType: PreviewEntityType, entityId: string) {
  const qc = useQueryClient()
  return useMemo(() => {
    if (!entityId) return null
    const key = buildQueryKey(entityType, entityId)
    return qc.getQueryData(key) ?? null
  }, [qc, entityType, entityId])
}

// Mobile detection — coarse pointer means touchscreen, skip tooltip
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches
}

interface PreviewContentProps {
  entityType: PreviewEntityType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

function PreviewContent({ entityType, data }: PreviewContentProps) {
  const name: string =
    data.name ?? data.title ?? data.code ?? "—"

  const renderStatusBadge = () => {
    if (!data.status) return null
    switch (entityType) {
      case "project":
        return <StatusBadge status={data.status} labels={PROJECT_STATUS_LABELS} />
      case "task":
        return <StatusBadge status={data.status} labels={TASK_STATUS_LABELS} />
      case "risk":
        return <StatusBadge status={data.status} labels={RISK_STATUS_LABELS} />
      case "document":
        return <StatusBadge status={data.status} labels={DOCUMENT_STATUS_LABELS} />
    }
  }

  const deadline: string | null =
    data.targetEndDate ?? data.dueDate ?? data.updatedAt ?? null

  const progressOrScore: string | null = (() => {
    if (data.completionPercentage != null)
      return `${Math.round(data.completionPercentage as number)}% completato`
    if (data.riskScore != null)
      return `Score: ${data.riskScore}`
    return null
  })()

  return (
    <div className="flex flex-col gap-1.5 max-w-[220px]">
      <p className="font-medium text-sm leading-tight line-clamp-2">{name}</p>
      {renderStatusBadge() && (
        <div className="flex items-center gap-1">{renderStatusBadge()}</div>
      )}
      {progressOrScore && (
        <p className="text-xs text-muted-foreground">{progressOrScore}</p>
      )}
      {deadline && (
        <p className="text-xs text-muted-foreground">
          Scadenza: {formatDate(deadline)}
        </p>
      )}
    </div>
  )
}

export function EntityPreviewTooltip({
  entityType,
  entityId,
  children,
}: EntityPreviewTooltipProps) {
  const cachedData = useCachedEntity(entityType, entityId)

  // No cached data or mobile — render children as-is (no API call)
  if (!cachedData || !entityId || isMobileDevice()) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          <PreviewContent
            entityType={entityType}
            data={cachedData as Record<string, unknown>}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
