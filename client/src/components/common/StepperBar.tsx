import { type LucideIcon, Check, AlertTriangle, Circle } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export interface StepperStep {
  key: string
  label: string
  icon?: LucideIcon
  status: "completed" | "current" | "upcoming" | "blocked"
  description?: string
}

interface StepperBarProps {
  steps: StepperStep[]
  onStepClick?: (stepKey: string) => void
  size?: "sm" | "md"
  className?: string
}

const sizeConfig = {
  sm: { circle: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-xs", gap: "gap-1" },
  md: { circle: "h-9 w-9", icon: "h-4 w-4", text: "text-xs", gap: "gap-1.5" },
}

const statusStyles = {
  completed: {
    circle: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
    line: "bg-green-400 dark:bg-green-600",
  },
  current: {
    circle: "bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500",
    line: "bg-border",
  },
  upcoming: {
    circle: "bg-muted text-muted-foreground border-border",
    line: "bg-border",
  },
  blocked: {
    circle: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
    line: "bg-border",
  },
}

function StepIcon({ step, size }: { step: StepperStep; size: "sm" | "md" }) {
  const s = sizeConfig[size]
  const Icon = step.icon

  if (step.status === "completed") return <Check className={s.icon} />
  if (step.status === "blocked") return <AlertTriangle className={s.icon} />
  if (Icon) return <Icon className={s.icon} />
  return <Circle className={cn(s.icon, "fill-current")} />
}

export function StepperBar({ steps, onStepClick, size = "md", className }: StepperBarProps) {
  const s = sizeConfig[size]

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex items-start min-w-max">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-start">
            {/* Step circle + label */}
            <div className={cn("flex flex-col items-center", s.gap)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    type="button"
                    className={cn(
                      "relative flex items-center justify-center rounded-full border-2 transition-colors",
                      s.circle,
                      statusStyles[step.status].circle,
                      onStepClick && "cursor-pointer hover:opacity-80",
                      !onStepClick && "cursor-default"
                    )}
                    onClick={() => onStepClick?.(step.key)}
                    whileHover={onStepClick ? { scale: 1.08 } : undefined}
                    whileTap={onStepClick ? { scale: 0.95 } : undefined}
                    transition={{ duration: 0.15 }}
                  >
                    <StepIcon step={step} size={size} />
                    {step.status === "current" && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-blue-400 dark:border-blue-500"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </motion.button>
                </TooltipTrigger>
                {step.description && (
                  <TooltipContent side="bottom">
                    <p className="text-xs">{step.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <span
                className={cn(
                  "max-w-[5rem] truncate text-center leading-tight",
                  s.text,
                  step.status === "current"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex items-center px-1 pt-[0.6rem]">
                <div
                  className={cn(
                    "h-0.5 w-8 rounded-full sm:w-12",
                    statusStyles[step.status].line,
                    step.status === "upcoming" && "opacity-50"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
