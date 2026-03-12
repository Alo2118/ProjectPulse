import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertTriangle,
  Timer,
  Square,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatHours } from '@/lib/utils'
import { useDashboardStatsQuery, useTodayTotalQuery } from '@/hooks/api/useDashboard'
import { useRunningTimerQuery, useStopTimer } from '@/hooks/api/useTimeEntries'
import { useTimerUIStore } from '@/stores/timerUiStore'
import { toast } from 'sonner'

// --- Types ---

interface KpiCardData {
  label: string
  value: string | null
  delta: number | null
  deltaPositiveIsGood: boolean
  icon: React.ReactNode
  iconColorClass: string
}

// --- Helpers ---

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime()
  const elapsed = Math.floor((Date.now() - start) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// --- Sub-components ---

function DeltaBadge({
  delta,
  positiveIsGood,
}: {
  delta: number
  positiveIsGood: boolean
}) {
  if (delta === 0) return null
  const isPositive = delta > 0
  const isGood = positiveIsGood ? isPositive : !isPositive
  return (
    <span
      className={cn(
        'text-xs font-medium tabular-nums',
        isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {isPositive ? '+' : ''}
      {delta}
    </span>
  )
}

function KpiStatCard({
  card,
  loading,
  index,
}: {
  card: KpiCardData
  loading: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          ) : (
            <div className="space-y-1">
              <div className={cn('inline-flex p-1.5 rounded-md', card.iconColorClass)}>
                {card.icon}
              </div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-data)' }}>
                  {card.value ?? '—'}
                </p>
                {card.delta !== null && (
                  <DeltaBadge delta={card.delta} positiveIsGood={card.deltaPositiveIsGood} />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TimerCard({ index }: { index: number }) {
  const navigate = useNavigate()
  const timerStore = useTimerUIStore()
  const todayQuery = useTodayTotalQuery()
  const runningQuery = useRunningTimerQuery()
  const stopTimer = useStopTimer()

  const [elapsed, setElapsed] = useState('')

  // Sync Zustand store from running timer query
  useEffect(() => {
    const running = runningQuery.data as
      | { id: string; taskId: string; startedAt: string; task?: { title: string } }
      | null
      | undefined
    if (running?.id) {
      timerStore.setRunning(running.id, running.taskId, running.startedAt)
    } else if (!runningQuery.isLoading && !running) {
      timerStore.clear()
    }
  }, [runningQuery.data, runningQuery.isLoading])

  // Live elapsed ticker
  useEffect(() => {
    if (!timerStore.startedAt) {
      setElapsed('')
      return
    }
    const update = () => setElapsed(formatElapsed(timerStore.startedAt!))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [timerStore.startedAt])

  const isRunning = !!timerStore.runningEntryId
  const todayMinutes = (todayQuery.data as { todayMinutes?: number } | null | undefined)?.todayMinutes ?? 0

  const runningData = runningQuery.data as
    | { id: string; taskId: string; startedAt: string; task?: { title: string } }
    | null
    | undefined

  const taskTitle = runningData?.task?.title ?? 'Task in corso'
  const truncatedTitle =
    taskTitle.length > 20 ? taskTitle.slice(0, 20) + '…' : taskTitle

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation()
    stopTimer.mutate(undefined, {
      onSuccess: () => {
        timerStore.clear()
        toast.success('Timer fermato')
      },
      onError: () => {
        toast.error('Errore nel fermare il timer')
      },
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="space-y-1">
            <div className="inline-flex p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <Timer className="h-5 w-5 text-amber-800 dark:text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">Timer</p>
            {isRunning ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => timerStore.taskId && navigate(`/tasks/${timerStore.taskId}`)}
                    className="block text-left text-sm font-medium truncate max-w-[120px] hover:text-primary transition-colors"
                    title={taskTitle}
                  >
                    {truncatedTitle}
                  </button>
                  <p className="text-xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-data)' }}>
                    {elapsed}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStop}
                  disabled={stopTimer.isPending}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Ferma timer"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground" style={{ fontFamily: 'var(--font-data)' }}>
                Nessun timer
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Oggi:{' '}
              {todayQuery.isLoading ? '…' : formatHours(todayMinutes)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// --- Main Component ---

export function KpiStrip() {
  const statsQuery = useDashboardStatsQuery()

  const stats = statsQuery.data as
    | {
        activeProjects?: number
        activeProjectsDelta?: number
        openTasks?: number
        openTasksDelta?: number
        weeklyHours?: number
        weeklyHoursDelta?: number
        openRisks?: number
        criticalRisks?: number
      }
    | null
    | undefined

  const cards: KpiCardData[] = [
    {
      label: 'Progetti Attivi',
      value: stats?.activeProjects != null ? String(stats.activeProjects) : null,
      delta: stats?.activeProjectsDelta ?? null,
      deltaPositiveIsGood: true,
      icon: <FolderKanban className="h-5 w-5 text-blue-800 dark:text-blue-400" />,
      iconColorClass: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Task Aperti',
      value: stats?.openTasks != null ? String(stats.openTasks) : null,
      delta: stats?.openTasksDelta ?? null,
      deltaPositiveIsGood: false,
      icon: <CheckSquare className="h-5 w-5 text-amber-800 dark:text-amber-400" />,
      iconColorClass: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Ore Settimana',
      value:
        stats?.weeklyHours != null ? formatHours(stats.weeklyHours * 60) : null,
      delta: null,
      deltaPositiveIsGood: true,
      icon: <Clock className="h-5 w-5 text-green-800 dark:text-green-400" />,
      iconColorClass: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Rischi Aperti',
      value: stats?.openRisks != null ? String(stats.openRisks) : null,
      delta: stats?.criticalRisks ?? null,
      deltaPositiveIsGood: false,
      icon: <AlertTriangle className="h-5 w-5 text-red-800 dark:text-red-400" />,
      iconColorClass: 'bg-red-100 dark:bg-red-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, i) => (
        <KpiStatCard key={card.label} card={card} loading={statsQuery.isLoading} index={i} />
      ))}
      <TimerCard index={cards.length} />
    </div>
  )
}
