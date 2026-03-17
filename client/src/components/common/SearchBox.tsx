import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchBoxProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchBox({ value, onChange, placeholder = "Cerca...", className }: SearchBoxProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <Search
        style={{
          position: "absolute",
          left: "10px",
          width: "13px",
          height: "13px",
          color: "var(--text-muted)",
          flexShrink: 0,
          pointerEvents: "none",
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontSize: "13px",
          padding: "7px 12px 7px 30px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm, 5px)",
          color: "var(--text-primary)",
          width: "200px",
          outline: "none",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-active)"
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-default)"
          e.currentTarget.style.boxShadow = "none"
        }}
      />
    </div>
  )
}
