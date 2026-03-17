import { cn } from "@/lib/utils"
import { DOMAIN_COLORS } from "@/lib/constants"
import { DOMAIN_ICONS } from "@/lib/theme-config"

interface DomainBadgeProps {
  domain: string
  label: string
  className?: string
}

/**
 * Larger domain badge used in page headers.
 * Includes a 12px domain icon + label.
 * From mockup: padding 3px 10px 3px 7px, border-radius 6px, font-size 11px, font-weight 600.
 */
export function DomainBadge({ domain, label, className }: DomainBadgeProps) {
  const colors = DOMAIN_COLORS[domain]
  const IconComponent = DOMAIN_ICONS[domain]

  return (
    <span
      style={
        colors
          ? {
              background: colors.bg,
              color: colors.text,
              borderColor: colors.border,
              padding: "3px 10px 3px 7px",
              borderRadius: "6px",
            }
          : { padding: "3px 10px 3px 7px", borderRadius: "6px" }
      }
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        "border border-transparent",
        "text-[11px] font-semibold leading-none",
        !colors && "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {IconComponent && (
        <IconComponent
          style={{ width: 12, height: 12 }}
          className="shrink-0"
        />
      )}
      {label}
    </span>
  )
}
