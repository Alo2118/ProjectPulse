import { cn } from "@/lib/utils"

type RoleValue = "direzione" | "dipendente"

interface RoleToggleProps {
  value: RoleValue
  onChange: (v: RoleValue) => void
  className?: string
}

const ROLES: Array<{ value: RoleValue; label: string; activeColor: string }> = [
  { value: "direzione", label: "Direzione", activeColor: "#a5b4fc" },
  { value: "dipendente", label: "Dipendente", activeColor: "#4ade80" },
]

export function RoleToggle({ value, onChange, className }: RoleToggleProps) {
  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{
        gap: "4px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "6px",
        padding: "3px",
      }}
    >
      {ROLES.map((role) => {
        const isActive = role.value === value
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 14px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              background: isActive ? "var(--bg-overlay)" : "transparent",
              color: isActive ? role.activeColor : "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {role.label}
          </button>
        )
      })}
    </div>
  )
}
