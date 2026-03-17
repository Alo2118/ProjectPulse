import { useState, useEffect } from 'react'
import { Bell, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertRow, type AlertRowProps } from './AlertRow'
import type { AlertSeverity } from '@/lib/constants'

export interface AlertItem extends AlertRowProps {
  id: string
}

interface AlertStripProps {
  alerts: AlertItem[]
  title?: string
  storageKey?: string
  className?: string
}

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'warning', 'info']

const countBadgeConfig = {
  critical: {
    label: (n: number) => `${n} ${n === 1 ? 'critico' : 'critici'}`,
    className:
      'bg-red-500/10 text-[#f87171] border border-red-500/20 text-[9px] font-bold px-[7px] py-[2px] rounded-[3px]',
  },
  warning: {
    label: (n: number) => `${n} ${n === 1 ? 'avviso' : 'avvisi'}`,
    className:
      'bg-orange-500/[0.08] text-[#fb923c] border border-orange-500/20 text-[9px] font-bold px-[7px] py-[2px] rounded-[3px]',
  },
  info: {
    label: (n: number) => `${n} info`,
    className:
      'bg-blue-500/[0.08] text-[#60a5fa] border border-blue-500/20 text-[9px] font-bold px-[7px] py-[2px] rounded-[3px]',
  },
} as const

function useCollapsed(storageKey: string, defaultValue = false) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? stored === 'true' : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(collapsed))
    } catch {
      // ignore storage errors (e.g. private mode)
    }
  }, [storageKey, collapsed])

  return [collapsed, setCollapsed] as const
}

export function AlertStrip({
  alerts,
  title = 'Attenzione richiesta',
  storageKey = 'alert-strip-collapsed',
  className,
}: AlertStripProps) {
  const [collapsed, setCollapsed] = useCollapsed(storageKey)

  if (alerts.length === 0) return null

  const counts = SEVERITY_ORDER.reduce<Record<AlertSeverity, number>>(
    (acc, sev) => {
      acc[sev] = alerts.filter((a) => a.severity === sev).length
      return acc
    },
    { critical: 0, warning: 0, info: 0 },
  )

  // Sort alerts: critical first, then warning, then info
  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius)] border border-border bg-card',
        'mx-7',
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'flex w-full select-none items-center gap-[10px] px-4 py-[10px]',
          'border-b border-border',
          'transition-colors duration-[120ms] hover:bg-accent/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-expanded={!collapsed}
      >
        {/* Title */}
        <div className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Bell className="h-3 w-3" strokeWidth={2} />
          {title}
        </div>

        {/* Severity count badges */}
        <div className="flex items-center gap-[6px]">
          {SEVERITY_ORDER.map((sev) => {
            const count = counts[sev]
            if (count === 0) return null
            const cfg = countBadgeConfig[sev]
            return (
              <span key={sev} className={cfg.className}>
                {cfg.label(count)}
              </span>
            )
          })}
        </div>

        {/* Chevron */}
        <ChevronUp
          className={cn(
            'ml-auto h-[14px] w-[14px] shrink-0 text-muted-foreground',
            'transition-transform duration-200',
            collapsed && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="alert-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div>
              {sorted.map((alert) => (
                <AlertRow
                  key={alert.id}
                  severity={alert.severity}
                  title={alert.title}
                  subtitle={alert.subtitle}
                  projectName={alert.projectName}
                  time={alert.time}
                  onClick={alert.onClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
