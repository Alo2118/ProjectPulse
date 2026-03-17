import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAutomationLogsQuery } from "@/hooks/api/useAutomations"
import { cn, formatDateTime } from "@/lib/utils"

interface AutomationLog {
  id: string
  ruleId: string
  triggerId: string | null
  status: string
  details: string | null
  createdAt: string
}

interface AutomationLogsViewerProps {
  ruleId: string
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  skipped: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
}

const STATUS_LABELS: Record<string, string> = {
  success: "Successo",
  error: "Errore",
  skipped: "Saltato",
}

function LogsSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-48 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function AutomationLogsViewer({ ruleId }: AutomationLogsViewerProps) {
  const { data, isLoading } = useAutomationLogsQuery(ruleId)

  const rawLogs = data?.logs ?? data
  const logs: AutomationLog[] = Array.isArray(rawLogs) ? rawLogs : []

  if (isLoading) {
    return <LogsSkeleton />
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm font-medium text-foreground">
          Nessuna esecuzione registrata
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          I log appariranno quando la regola viene eseguita.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">Data</TableHead>
            <TableHead className="w-[100px]">Stato</TableHead>
            <TableHead className="w-[120px]">Entita</TableHead>
            <TableHead>Dettagli</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(log.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    STATUS_BADGE_CLASSES[log.status] ?? ""
                  )}
                >
                  {STATUS_LABELS[log.status] ?? log.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {log.triggerId ? log.triggerId.slice(0, 8) + "..." : "-"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                {log.details ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
