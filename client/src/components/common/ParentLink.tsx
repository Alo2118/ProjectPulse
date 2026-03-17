import { Link } from "react-router-dom"
import {
  FolderKanban,
  Flag,
  CheckSquare,
  GitBranch,
  AlertTriangle,
  FileText,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DOMAIN_COLORS_LEGACY } from "@/lib/constants"
import {
  EntityPreviewTooltip,
  type PreviewEntityType,
} from "@/components/common/EntityPreviewTooltip"

// Domain to icon mapping (matches CLAUDE.md Context Color System)
const DOMAIN_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
  risk: AlertTriangle,
  document: FileText,
  user: Users,
  team: Users,
}

// Domains that map to a PreviewEntityType
const PREVIEW_DOMAINS: Record<string, PreviewEntityType> = {
  project: "project",
  task: "task",
  milestone: "task",
  subtask: "task",
  risk: "risk",
  document: "document",
}

// Extract the last path segment as an ID (e.g. "/projects/abc-123" → "abc-123")
function extractIdFromHref(href: string): string {
  const parts = href.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

interface ParentLinkProps {
  name: string
  href: string
  domain: string
  className?: string
}

export function ParentLink({ name, href, domain, className }: ParentLinkProps) {
  const Icon = DOMAIN_ICONS[domain]
  const domainColorClasses = DOMAIN_COLORS_LEGACY[domain]
  // Extract just the text color parts from the domain color string
  const iconColorClass = domainColorClasses
    ? domainColorClasses
        .split(" ")
        .filter((c) => c.startsWith("text-") || c.startsWith("dark:text-"))
        .join(" ")
    : ""

  const entityType = PREVIEW_DOMAINS[domain]
  const entityId = extractIdFromHref(href)

  const linkEl = (
    <Link
      to={href}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {Icon && (
        <Icon
          className={cn("h-3 w-3 shrink-0", iconColorClass || "text-muted-foreground")}
        />
      )}
      <span className="truncate max-w-[200px]">{name}</span>
    </Link>
  )

  if (!entityType || !entityId) {
    return linkEl
  }

  return (
    <EntityPreviewTooltip entityType={entityType} entityId={entityId}>
      {linkEl}
    </EntityPreviewTooltip>
  )
}
