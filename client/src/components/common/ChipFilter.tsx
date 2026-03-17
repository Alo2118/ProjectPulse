import { cn } from "@/lib/utils"

interface ActiveColor {
  bg: string
  text: string
  border: string
}

interface ChipFilterProps {
  label: string
  isActive?: boolean
  activeColor?: ActiveColor
  onClick?: () => void
  className?: string
}

export function ChipFilter({
  label,
  isActive = false,
  activeColor,
  onClick,
  className,
}: ChipFilterProps) {
  const baseStyle: React.CSSProperties = {
    padding: "5px 11px",
    fontSize: "11px",
    fontWeight: 600,
    borderRadius: "5px",
    cursor: "pointer",
    border: "1px solid",
    display: "inline-flex",
    alignItems: "center",
    transition: "background 0.15s, border-color 0.15s",
    whiteSpace: "nowrap",
    userSelect: "none",
  }

  const activeStyle: React.CSSProperties = activeColor
    ? {
        background: activeColor.bg,
        color: activeColor.text,
        borderColor: activeColor.border,
      }
    : {
        background: "rgba(45,140,240,0.12)",
        color: "#60a5fa",
        borderColor: "rgba(45,140,240,0.4)",
      }

  const inactiveStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    borderColor: "var(--border-default)",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(className)}
      style={{
        ...baseStyle,
        ...(isActive ? activeStyle : inactiveStyle),
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--bg-hover)"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--bg-elevated)"
        }
      }}
    >
      {label}
    </button>
  )
}
