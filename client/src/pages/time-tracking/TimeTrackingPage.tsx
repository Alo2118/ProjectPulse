import { useState, useMemo, useCallback } from "react"
import { Plus, Clock, CalendarDays, List, ChevronRight } from "lucide-react"
import { parseISO, format, isToday, isYesterday } from "date-fns"
import { it } from "date-fns/locale"
import { useSetPageContext } from "@/hooks/ui/usePageContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable, type Column } from "@/components/common/DataTable"
import { TimerWidget } from "@/components/domain/time/TimerWidget"
import { TimeEntryFormDialog } from "@/components/domain/time/TimeEntryFormDialog"
import { useTimeEntryListQuery } from "@/hooks/api/useTimeEntries"
import { formatHours, cn } from "@/lib/utils"
import { TIME_ENTRY_STATUS_LABELS } from "@/lib/constants"

interface TimeEntryRow {
  id: string
  description?: string | null
  startTime: string
  endTime?: string | null
  duration: number | null
  taskId: string
  approvalStatus: string
  task?: { id: string; title: string; code?: string }
}

interface DayGroup {
  dateKey: string
  label: string
  totalHours: number
  entries: TimeEntryRow[]
}

function getDayKey(startTime: string): string {
  return format(parseISO(startTime), "yyyy-MM-dd")
}

function getDayLabel(dateKey: string): string {
  const d = parseISO(dateKey)
  if (isToday(d)) return "Oggi"
  if (isYesterday(d)) return "Ieri"
  return format(d, "EEEE d MMMM yyyy", { locale: it })
}

function TimeTrackingPage() {
  useSetPageContext({ domain: 'time_entry' })
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntryRow | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(() => new Set())
  const limit = 50

  const filters = useMemo(() => {
    const f: Record<string, unknown> = { page, limit }
    if (dateFrom) f.dateFrom = dateFrom
    if (dateTo) f.dateTo = dateTo
    return f
  }, [page, dateFrom, dateTo])

  const { data: entriesData, isLoading } = useTimeEntryListQuery(filters)

  const entries: TimeEntryRow[] = useMemo(() => {
    const list = entriesData?.data
    return Array.isArray(list) ? list : []
  }, [entriesData])

  const totalPages = useMemo(() => {
    const pagination = entriesData?.pagination
    return pagination?.pages ?? 1
  }, [entriesData])

  // Group entries by day
  const dayGroups: DayGroup[] = useMemo(() => {
    if (entries.length === 0) return []
    const map = new Map<string, TimeEntryRow[]>()
    for (const entry of entries) {
      const key = getDayKey(entry.startTime)
      const list = map.get(key)
      if (list) list.push(entry)
      else map.set(key, [entry])
    }
    // Sort days descending (most recent first)
    const sortedKeys = [...map.keys()].sort((a, b) => b.localeCompare(a))
    return sortedKeys.map((dateKey) => {
      const dayEntries = map.get(dateKey)!
      const totalHours = dayEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
      return {
        dateKey,
        label: getDayLabel(dateKey),
        totalHours,
        entries: dayEntries,
      }
    })
  }, [entries])

  const toggleDay = useCallback((dateKey: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dateKey)) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
  }, [])

  const handleOpenCreate = useCallback(() => {
    setEditEntry(undefined)
    setFormOpen(true)
  }, [])

  const handleRowClick = useCallback((entry: TimeEntryRow) => {
    setEditEntry(entry)
    setFormOpen(true)
  }, [])

  const columns: Column<TimeEntryRow>[] = useMemo(
    () => [
      {
        key: "task",
        header: "Task",
        cell: (item) => (
          <div className="min-w-0 py-0.5">
            <span className="font-medium text-sm truncate block leading-tight">
              {item.task?.title ?? "—"}
            </span>
            {item.description && (
              <span className="text-[11px] text-muted-foreground truncate block">
                {item.description}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "duration",
        header: "Durata",
        sortable: true,
        className: "w-[80px]",
        cell: (item) => (
          <span className="text-xs tabular-nums font-medium font-data">
            {formatHours(item.duration ?? 0)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Stato",
        className: "w-[100px]",
        cell: (item) => (
          <StatusBadge status={item.approvalStatus} labels={TIME_ENTRY_STATUS_LABELS} />
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      {/* Timer widget - always visible at top */}
      <TimerWidget />

      {/* Tabs: Lista / Timesheet */}
      <Tabs defaultValue="lista">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="lista" className="gap-1.5">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Timesheet
            </TabsTrigger>
          </TabsList>

          <Button onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Registra Tempo
          </Button>
        </div>

        {/* Lista view */}
        <TabsContent value="lista" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Da:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">A:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-auto"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); setPage(1) }}
              >
                Cancella filtri
              </Button>
            )}
          </div>

          {/* Grouped by day */}
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  columns={columns}
                  data={[]}
                  isLoading
                  loadingRows={5}
                  getId={(item) => item.id}
                />
              </CardContent>
            </Card>
          ) : dayGroups.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              {dayGroups.map(({ dateKey, label, totalHours, entries: dayEntries }) => {
                const isCollapsed = collapsedDays.has(dateKey)
                return (
                  <div key={dateKey}>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 border-b",
                        "bg-muted/30 hover:bg-muted/50 transition-colors",
                        "text-sm font-medium text-foreground cursor-pointer select-none"
                      )}
                      onClick={() => toggleDay(dateKey)}
                      aria-expanded={!isCollapsed}
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150",
                          !isCollapsed && "rotate-90"
                        )}
                      />
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="capitalize">{label}</span>
                      <span className="ml-1 text-xs text-muted-foreground tabular-nums font-data">
                        ({dayEntries.length})
                      </span>
                      <span className="ml-auto text-xs tabular-nums font-medium font-data">
                        {formatHours(totalHours)}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <DataTable
                        columns={columns}
                        data={dayEntries}
                        onRowClick={handleRowClick}
                        getId={(item) => item.id}
                        isLoading={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nessuna registrazione trovata
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Precedente
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {page} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Successiva
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Timesheet view - placeholder */}
        <TabsContent value="timesheet">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Vista Timesheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                La vista timesheet settimanale sara disponibile in una prossima versione.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form dialog */}
      <TimeEntryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editEntry}
      />
    </div>
  )
}

export default TimeTrackingPage
