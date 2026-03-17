import { Lightbulb } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Suggestion } from "@/lib/workflow-engine"

interface NextActionSuggestionProps {
  suggestions: Suggestion[]
  onAction?: (suggestion: Suggestion) => void
  className?: string
}

export function NextActionSuggestion({
  suggestions,
  onAction,
  className,
}: NextActionSuggestionProps) {
  if (suggestions.length === 0) return null

  // Show only the first (highest priority) suggestion
  const suggestion = suggestions[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[var(--radius)] border border-border bg-muted/50 p-4 flex items-start gap-3",
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        <Lightbulb className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{suggestion.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
      </div>
      {(suggestion.actionType === "navigate" || suggestion.actionType === "dialog") && onAction && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs"
          onClick={() => onAction(suggestion)}
        >
          Vai
        </Button>
      )}
    </motion.div>
  )
}
