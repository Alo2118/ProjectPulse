import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ViewOption {
  value: string
  label: string
  icon?: ReactNode
}

interface ViewToggleProps {
  options: ViewOption[]
  value: string
  onChange: (v: string) => void
  className?: string
}

export function ViewToggle({ options, value, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn("inline-flex", className)}
      style={{
        gap: "2px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "6px",
        padding: "2px",
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              background: isActive ? "var(--bg-overlay)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
