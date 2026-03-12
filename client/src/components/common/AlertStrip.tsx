import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ALERT_SEVERITY, type AlertSeverity } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'

export interface AlertItem {
  id: string
  severity: AlertSeverity
  title: string
  subtitle?: string
  projectName?: string
  time: string
}

interface AlertStripProps {
  alerts: AlertItem[]
  className?: string
}

const severityIcons = { critical: AlertTriangle, warning: AlertCircle, info: Info }

export function AlertStrip({ alerts, className }: AlertStripProps) {
  const [collapsed, setCollapsed] = useState(false)

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }

  if (alerts.length === 0) return null

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/5"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">Attenzione</span>
          <div className="flex items-center gap-1.5">
            {counts.critical > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-red-500/30 px-1.5 text-[10px] text-red-500">
                {counts.critical}
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-orange-500/30 px-1.5 text-[10px] text-orange-500">
                {counts.warning}
              </Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="outline" className="h-5 gap-1 border-blue-500/30 px-1.5 text-[10px] text-blue-500">
                {counts.info}
              </Badge>
            )}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', !collapsed && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0 border-t border-border">
              {alerts.map((alert) => {
                const config = ALERT_SEVERITY[alert.severity]
                const Icon = severityIcons[alert.severity]
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-start gap-3 border-l-[3px] px-3 py-2.5',
                      config.border, config.bg
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{alert.title}</div>
                      {alert.subtitle && (
                        <div className="text-[11px] text-muted-foreground">{alert.subtitle}</div>
                      )}
                    </div>
                    {alert.projectName && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {alert.projectName}
                      </Badge>
                    )}
                    <span className="shrink-0 text-[10px] text-muted-foreground">{alert.time}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
