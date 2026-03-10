import { Link } from "react-router-dom"
import { Lightbulb } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ---- Types ----

export interface SidebarSuggestion {
  icon: string
  message: string
  actionLabel: string
  actionHref: string
}

interface SidebarActionSuggestionProps {
  suggestions: SidebarSuggestion[]
  className?: string
}

// ---- Component ----

export function SidebarActionSuggestion({
  suggestions,
  className,
}: SidebarActionSuggestionProps) {
  if (suggestions.length === 0) return null

  // Show only the first (highest priority) suggestion
  const suggestion = suggestions[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-3",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-1">
            <span className="text-base leading-none shrink-0 mt-0.5">
              {suggestion.icon}
            </span>
            <p className="text-xs text-foreground">{suggestion.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-primary hover:text-primary w-full justify-start"
            asChild
          >
            <Link to={suggestion.actionHref}>{suggestion.actionLabel}</Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
