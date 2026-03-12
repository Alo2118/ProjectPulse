import { Flag, CheckSquare, GitBranch, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

export interface PlanTask {
  tempId: string
  title: string
  taskType: string
  estimatedHours?: number
  priority?: string
  assigneeId?: string | null
  parentTempId?: string | null
  startDate?: string | null
  dueDate?: string | null
}

interface WizardStepPreviewProps {
  tasks: PlanTask[]
  onTasksChange: (tasks: PlanTask[]) => void
  onNext: () => void
  onBack: () => void
}

const typeIcons: Record<string, typeof Flag> = {
  milestone: Flag,
  task: CheckSquare,
  subtask: GitBranch,
}

function getDepth(task: PlanTask, taskMap: Map<string, PlanTask>): number {
  if (!task.parentTempId) return 0
  const parent = taskMap.get(task.parentTempId)
  return parent ? 1 + getDepth(parent, taskMap) : 0
}

export function WizardStepPreview({
  tasks,
  onTasksChange,
  onNext,
  onBack,
}: WizardStepPreviewProps) {
  const taskMap = new Map(tasks.map((t) => [t.tempId, t]))

  // Build ordered list respecting hierarchy
  const orderedTasks: PlanTask[] = []
  const addWithChildren = (parentId: string | null, depth: number) => {
    for (const t of tasks) {
      if ((t.parentTempId ?? null) === parentId) {
        orderedTasks.push(t)
        addWithChildren(t.tempId, depth + 1)
      }
    }
  }
  addWithChildren(null, 0)

  const handleTitleChange = (tempId: string, title: string) => {
    onTasksChange(tasks.map((t) => (t.tempId === tempId ? { ...t, title } : t)))
  }

  const handleDelete = (tempId: string) => {
    // Delete task and all its children
    const idsToDelete = new Set<string>()
    const collectChildren = (id: string) => {
      idsToDelete.add(id)
      tasks.filter((t) => t.parentTempId === id).forEach((t) => collectChildren(t.tempId))
    }
    collectChildren(tempId)
    onTasksChange(tasks.filter((t) => !idsToDelete.has(t.tempId)))
  }

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0)
  const milestoneCount = tasks.filter((t) => t.taskType === "milestone").length
  const taskCount = tasks.filter((t) => t.taskType === "task").length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{milestoneCount} milestone</span>
        <span>{taskCount} task</span>
        {totalHours > 0 && <span>{totalHours}h stimate</span>}
      </div>

      <Card>
        <CardContent className="p-0">
          {orderedTasks.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nessun elemento nel piano.
            </div>
          ) : (
            <div className="divide-y">
              {orderedTasks.map((task) => {
                const depth = getDepth(task, taskMap)
                const Icon = typeIcons[task.taskType] ?? CheckSquare

                return (
                  <div
                    key={task.tempId}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
                    style={{ paddingLeft: `${12 + depth * 24}px` }}
                  >
                    {depth > 0 && (
                      <span className="text-muted-foreground/40 text-xs">└</span>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0 shrink-0",
                        TASK_TYPE_COLORS[task.taskType]
                      )}
                    >
                      <Icon className="h-3 w-3 mr-0.5" />
                      {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
                    </Badge>
                    <Input
                      value={task.title}
                      onChange={(e) => handleTitleChange(task.tempId, e.target.value)}
                      className="h-7 text-sm border-transparent hover:border-input focus:border-input"
                    />
                    {task.estimatedHours != null && task.estimatedHours > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {task.estimatedHours}h
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(task.tempId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          &larr; Indietro
        </Button>
        <Button onClick={onNext} disabled={orderedTasks.length === 0}>
          Avanti &rarr;
        </Button>
      </div>
    </div>
  )
}
