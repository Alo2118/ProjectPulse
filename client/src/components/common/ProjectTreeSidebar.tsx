import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Flag } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { StatusDot } from "@/components/common/StatusDot"
import { useTaskListQuery } from "@/hooks/api/useTasks"
import { cn } from "@/lib/utils"

// ---- Types ----

interface FlatTask {
  id: string
  title: string
  taskType: string
  status: string
  parentTaskId: string | null
}

interface TreeNode extends FlatTask {
  children: TreeNode[]
}

// ---- Tree builder ----

function buildTree(tasks: FlatTask[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] })
  }

  for (const t of tasks) {
    const node = map.get(t.id)!
    if (t.parentTaskId && map.has(t.parentTaskId)) {
      map.get(t.parentTaskId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

// ---- SubtaskRow ----

interface SubtaskRowProps {
  node: TreeNode
}

function SubtaskRow({ node }: SubtaskRowProps) {
  return (
    <Link
      to={`/tasks/${node.id}`}
      className={cn(
        "flex items-center gap-1.5 py-1 pl-8 pr-1 rounded-sm text-xs",
        "hover:bg-muted/60 transition-colors",
        node.status === "blocked" && "text-destructive"
      )}
    >
      <StatusDot status={node.status} size="sm" />
      <span className="truncate">{node.title}</span>
    </Link>
  )
}

// ---- TaskRow ----

interface TaskRowProps {
  node: TreeNode
}

function TaskRow({ node }: TaskRowProps) {
  return (
    <Link
      to={`/tasks/${node.id}`}
      className={cn(
        "flex items-center gap-1.5 py-1 pl-4 pr-1 rounded-sm text-xs",
        "hover:bg-muted/60 transition-colors",
        node.status === "blocked" && "text-destructive"
      )}
    >
      <StatusDot status={node.status} size="sm" />
      <span className="truncate">{node.title}</span>
    </Link>
  )
}

// ---- MilestoneRow ----

interface MilestoneRowProps {
  node: TreeNode
  defaultOpen: boolean
}

function MilestoneRow({ node, defaultOpen }: MilestoneRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  const taskChildren = node.children.filter((c) => c.taskType !== "milestone")
  const completedCount = taskChildren.filter((c) => c.status === "done" || c.status === "cancelled").length
  const totalCount = taskChildren.length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 px-1 rounded-sm text-xs font-semibold",
          "hover:bg-muted/60 transition-colors text-left",
          node.status === "blocked" && "text-destructive"
        )}
        aria-expanded={open}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0"
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </motion.span>
        <Flag className="h-3 w-3 shrink-0 text-purple-500" />
        <span className="truncate flex-1">{node.title}</span>
        {!open && totalCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-normal shrink-0 ml-1">
            {totalCount} task · {completedCount} completati
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && taskChildren.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {taskChildren.map((child) => (
              <div key={child.id}>
                <TaskRow node={child} />
                {child.children.map((sub) => (
                  <SubtaskRow key={sub.id} node={sub} />
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Main Component ----

interface ProjectTreeSidebarProps {
  projectId: string
}

export function ProjectTreeSidebar({ projectId }: ProjectTreeSidebarProps) {
  const { data, isLoading } = useTaskListQuery({
    projectId,
    includeSubtasks: true,
    limit: 100,
  })

  const tasks = useMemo((): FlatTask[] => {
    const raw = ((data as Record<string, unknown>)?.data ?? []) as FlatTask[]
    return raw
  }, [data])

  const tree = useMemo(() => buildTree(tasks), [tasks])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Nessun task
      </p>
    )
  }

  // Separate milestones and orphan root tasks
  const milestones = tree.filter((n) => n.taskType === "milestone")
  const orphanTasks = tree.filter((n) => n.taskType !== "milestone")

  // First milestone with non-completed children expanded by default
  const firstActiveIndex = milestones.findIndex((m) =>
    m.children.some((c) => c.status !== "done" && c.status !== "cancelled")
  )

  // Milestones with all completed tasks collapsed by default
  const isMilestoneDefaultOpen = (m: TreeNode, idx: number): boolean => {
    const allDone = m.children.every(
      (c) => c.status === "done" || c.status === "cancelled"
    )
    if (allDone) return false
    return idx === firstActiveIndex || (firstActiveIndex === -1 && idx === 0)
  }

  return (
    <div className="space-y-0.5">
      {milestones.map((m, idx) => (
        <MilestoneRow
          key={m.id}
          node={m}
          defaultOpen={isMilestoneDefaultOpen(m, idx)}
        />
      ))}

      {orphanTasks.length > 0 && (
        <>
          {milestones.length > 0 && (
            <p className="text-[10px] text-muted-foreground font-medium px-1 pt-2 pb-0.5 uppercase tracking-wide">
              Task senza milestone
            </p>
          )}
          {orphanTasks.map((t) => (
            <div key={t.id}>
              <TaskRow node={t} />
              {t.children.map((sub) => (
                <SubtaskRow key={sub.id} node={sub} />
              ))}
            </div>
          ))}
        </>
      )}

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs" asChild>
          <Link to={`/projects/${projectId}?tab=tasks`}>Vedi tutto →</Link>
        </Button>
      </div>
    </div>
  )
}
