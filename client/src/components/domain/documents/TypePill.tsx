import { cn } from "@/lib/utils"

/** Document type → label + colour palette */
const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  IFU: {
    label: "IFU",
    className:
      "bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  DHF: {
    label: "DHF",
    className:
      "bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  },
  Rischio: {
    label: "Rischio",
    className:
      "bg-orange-500/8 text-orange-400 border-orange-500/20 dark:bg-orange-500/8 dark:text-orange-400 dark:border-orange-500/20",
  },
  Audit: {
    label: "Audit",
    className:
      "bg-green-500/8 text-green-400 border-green-500/20 dark:bg-green-500/8 dark:text-green-400 dark:border-green-500/20",
  },
  Spec: {
    label: "Spec",
    className:
      "bg-cyan-500/8 text-cyan-400 border-cyan-500/20 dark:bg-cyan-500/8 dark:text-cyan-400 dark:border-cyan-500/20",
  },
  SOP: {
    label: "SOP",
    className:
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
  },
  WI: {
    label: "WI",
    className:
      "bg-teal-500/8 text-teal-400 border-teal-500/20 dark:bg-teal-500/8 dark:text-teal-400 dark:border-teal-500/20",
  },
  FORM: {
    label: "FORM",
    className:
      "bg-amber-500/8 text-amber-400 border-amber-500/20 dark:bg-amber-500/8 dark:text-amber-400 dark:border-amber-500/20",
  },
  // Backend type keys
  design_input: {
    label: "Design Input",
    className:
      "bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  design_output: {
    label: "Design Output",
    className:
      "bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
  },
  verification_report: {
    label: "Verifica",
    className:
      "bg-cyan-500/8 text-cyan-400 border-cyan-500/20 dark:bg-cyan-500/8 dark:text-cyan-400 dark:border-cyan-500/20",
  },
  validation_report: {
    label: "Validazione",
    className:
      "bg-green-500/8 text-green-400 border-green-500/20 dark:bg-green-500/8 dark:text-green-400 dark:border-green-500/20",
  },
  change_control: {
    label: "Change Ctrl",
    className:
      "bg-orange-500/8 text-orange-400 border-orange-500/20 dark:bg-orange-500/8 dark:text-orange-400 dark:border-orange-500/20",
  },
}

const DEFAULT_TYPE_CLASS =
  "bg-slate-500/10 text-slate-400 border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"

interface TypePillProps {
  type: string
  className?: string
}

export function TypePill({ type, className }: TypePillProps) {
  const config = TYPE_CONFIG[type]
  const label = config?.label ?? type
  const colorClass = config?.className ?? DEFAULT_TYPE_CLASS

  return (
    <span
      className={cn(
        "inline-flex items-center border font-bold uppercase tracking-wider whitespace-nowrap",
        colorClass,
        className
      )}
      style={{ padding: "2px 7px", borderRadius: "3px", fontSize: "10px" }}
    >
      {label}
    </span>
  )
}
