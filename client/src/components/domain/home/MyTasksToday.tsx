import { useNavigate } from 'react-router-dom'
import { CalendarDays, Play, Coffee } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/common/StatusDot'
import { ParentLink } from '@/components/common/ParentLink'
import { cn } from '@/lib/utils'
import { useMyTasksTodayQuery, type MyTaskToday } from '@/hooks/api/useDashboard'
import { useStartTimer } from '@/hooks/api/useTimeEntries'
import { useTimerUIStore } from '@/stores/timerUiStore'
import { toast } from 'sonner'

// --- Sub-components ---

function TaskRow({ task, index }: { task: MyTaskToday; index: number }) {
  const navigate = useNavigate()
  const startTimer = useStartTimer()
  const timerStore = useTimerUIStore()
  const isTimerRunning = !!timerStore.runningEntryId

  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation()
    if (isTimerRunning) {
      toast.warning('Ferma il timer attuale prima di avviarne uno nuovo')
      return
    }
    startTimer.mutate(
      { taskId: task.id },
      {
        onSuccess: (entry: unknown) => {
          const e = entry as { id: string; taskId: string; startedAt: string }
          timerStore.setRunning(e.id, e.taskId, e.startedAt)
          toast.success('Timer avviato')
        },
        onError: () => {
          toast.error("Errore nell'avvio del timer")
        },
      }
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50 transition-colors group"
    >
      <StatusDot status={task.status} size="md" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate(`/tasks/${task.id}`)}
          className="block text-left text-sm font-medium truncate hover:text-primary transition-colors w-full"
        >
          {task.title}
        </button>
        {task.project && (
          <ParentLink
            name={task.project.name}
            href={`/projects/${task.project.id}`}
            domain="project"
          />
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlay}
        disabled={startTimer.isPending}
        className={cn(
          'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
          'text-muted-foreground hover:text-primary'
        )}
        aria-label={`Avvia timer per ${task.title}`}
      >
        <Play className="h-4 w-4" />
      </Button>
    </motion.div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      ))}
    </div>
  )
}

// --- Main Component ---

export function MyTasksToday() {
  const { data, isLoading } = useMyTasksTodayQuery()

  const tasks = (data as MyTaskToday[] | null | undefined) ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          I Miei Task Oggi
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonRows />
        ) : tasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-2 py-6 text-center"
          >
            <Coffee className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nessun task per oggi</p>
          </motion.div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task, i) => (
              <TaskRow key={task.id} task={task} index={i} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
