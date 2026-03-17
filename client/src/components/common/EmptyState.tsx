import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        background: "var(--bg-surface)",
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius, 8px)",
        textAlign: "center",
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: "48px",
          height: "48px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: "20px", height: "20px" }} />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "300px",
          }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}
