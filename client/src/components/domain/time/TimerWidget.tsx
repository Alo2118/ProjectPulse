import { useEffect, useState, useCallback } from "react"
import { Play, Square } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useRunningTimerQuery, useStartTimer, useStopTimer } from "@/hooks/api/useTimeEntries"
import { useMyTasksQuery } from "@/hooks/api/useTasks"
import { useTimerUIStore } from "@/stores/timerUiStore"
import { cn } from "@/lib/utils"

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

interface RunningTimerEntry {
  id: string
  taskId: string
  startTime: string
  task?: { id: string; title: string; code?: string }
}

export function TimerWidget() {
  const { data: runningEntry, isLoading } = useRunningTimerQuery() as {
    data: RunningTimerEntry | null | undefined
    isLoading: boolean
  }
  const { data: myTasksData } = useMyTasksQuery()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const { setRunning, clear } = useTimerUIStore()

  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [elapsed, setElapsed] = useState(0)

  const isRunning = !!runningEntry

  // Sync timer UI store with server state
  useEffect(() => {
    if (runningEntry) {
      setRunning(runningEntry.id, runningEntry.taskId, runningEntry.startTime)
    } else {
      clear()
    }
  }, [runningEntry, setRunning, clear])

  // Live ticking elapsed time
  useEffect(() => {
    if (!runningEntry?.startTime) {
      setElapsed(0)
      return
    }

    const calcElapsed = () => {
      const start = new Date(runningEntry.startTime).getTime()
      return Math.floor((Date.now() - start) / 1000)
    }

    setElapsed(calcElapsed())
    const interval = setInterval(() => setElapsed(calcElapsed()), 1000)
    return () => clearInterval(interval)
  }, [runningEntry?.startTime])

  const handleStart = useCallback(() => {
    if (!selectedTaskId) {
      toast.error("Seleziona un task prima di avviare il timer")
      return
    }
    startTimer.mutate(
      { taskId: selectedTaskId },
      {
        onSuccess: () => toast.success("Timer avviato"),
        onError: () => toast.error("Errore nell'avvio del timer"),
      }
    )
  }, [selectedTaskId, startTimer])

  const handleStop = useCallback(() => {
    stopTimer.mutate(undefined, {
      onSuccess: () => toast.success("Timer fermato"),
      onError: () => toast.error("Errore nell'arresto del timer"),
    })
  }, [stopTimer])

  const tasks = Array.isArray(myTasksData?.data) ? myTasksData.data : []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        {isRunning ? (
          <>
            <Button
              size="icon"
              variant="destructive"
              onClick={handleStop}
              disabled={stopTimer.isPending}
              aria-label="Ferma timer"
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm text-muted-foreground truncate">
                {runningEntry?.task?.code
                  ? `${runningEntry.task.code} — ${runningEntry.task.title}`
                  : runningEntry?.task?.title ?? "Task"}
              </span>
              <span
                className={cn(
                  "text-2xl font-mono font-semibold tabular-nums tracking-wider",
                  "text-destructive"
                )}
              >
                {formatElapsed(elapsed)}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
              <span className="text-xs text-muted-foreground">In corso</span>
            </div>
          </>
        ) : (
          <>
            <Button
              size="icon"
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleStart}
              disabled={startTimer.isPending || !selectedTaskId}
              aria-label="Avvia timer"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Seleziona un task..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task: { id: string; title: string; code?: string }) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.code ? `${task.code} — ${task.title}` : task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-2xl font-mono font-semibold tabular-nums tracking-wider text-muted-foreground">
              00:00:00
            </span>
          </>
        )}
      </CardContent>
    </Card>
  )
}
